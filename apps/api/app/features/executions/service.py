"""Business logic for executions. Routers call service; service calls repository."""

import logging
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException
from sqlmodel import Session

from apps.api.app.core.celery import celery_app
from apps.api.app.core.config import settings
from apps.api.app.features.billing import service as billing_service
from apps.api.app.features.executions import repository
from apps.api.app.features.executions.models import Execution
from apps.api.app.features.workflows import repository as workflows_repo
from apps.api.app.features.workspaces import repository as workspaces_repo
from apps.api.app.integrations.registry import is_free, provider_usd, resolve_model

logger = logging.getLogger(__name__)


def _run_nodes(graph: dict, node_id: str | None) -> list[dict]:
    nodes = graph.get("nodes", [])
    selected = [n for n in nodes if n.get("id") == node_id] if node_id is not None else nodes
    # Uploaded assets are pass-through sources — never generated, never charged.
    return [n for n in selected if not (n.get("data") or {}).get("upload_key")]


def estimate_cost(graph: dict, node_id: str | None) -> float:
    """Credits a run will cost. For a single-node run only the target node
    generates (upstream reuses stored output), so only it is counted."""
    total = 0.0
    for node in _run_nodes(graph, node_id):
        model = resolve_model(node.get("type"), (node.get("data") or {}).get("model"))
        if model is not None:
            total += model.cost
    return total


def estimate_usd(graph: dict, node_id: str | None) -> float:
    """Estimated real provider spend (USD) for a run."""
    total = 0.0
    for node in _run_nodes(graph, node_id):
        model = resolve_model(node.get("type"), (node.get("data") or {}).get("model"))
        if model is not None:
            total += provider_usd(model)
    return total


def create_execution(
    session: Session,
    workspace_id: uuid.UUID,
    workflow_id: uuid.UUID,
    node_id: str | None = None,
) -> Execution:
    workflow = workflows_repo.get(session, workspace_id, workflow_id)
    if workflow is None:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Guardrail 0: paid-plan features. Video generation (real provider dollars
    # per run) needs any paid tier; premium models need Pro/Ultra/Studio.
    from apps.api.app.features.billing.plans import allows_premium_models

    workspace = workspaces_repo.get(session, workspace_id)
    plan = workspace.plan if workspace else "free"
    if plan == "free":
        for node in _run_nodes(workflow.graph, node_id):
            if node.get("type") in ("video", "world"):
                raise HTTPException(
                    status_code=402,
                    detail="Video generation needs a paid plan — upgrade to generate video.",
                )
    if not allows_premium_models(plan):
        for node in _run_nodes(workflow.graph, node_id):
            model = resolve_model(node.get("type"), (node.get("data") or {}).get("model"))
            if model is not None and not is_free(model):
                raise HTTPException(
                    status_code=402,
                    detail=f"{model.name} is a premium model — Pro and Ultra plans only.",
                )

    # Guardrail 1: never start a run the workspace can't pay for (credits).
    estimate = estimate_cost(workflow.graph, node_id)
    balance = billing_service.get_balance(session, workspace_id)
    if estimate > balance:
        raise HTTPException(
            status_code=402,
            detail=f"Insufficient credits: this run needs {estimate:g}, balance is {balance:g}.",
        )

    # Guardrail 2: daily provider-spend cap (real USD), if configured.
    cap = settings.daily_spend_cap_usd
    if cap > 0:
        since = datetime.now(UTC) - timedelta(days=1)
        spent = billing_service.spend_usd(session, workspace_id, since)
        run_usd = estimate_usd(workflow.graph, node_id)
        if spent + run_usd > cap:
            raise HTTPException(
                status_code=402,
                detail=f"Daily spend cap reached (${spent:.2f}/${cap:.2f}). Try again later.",
            )
        if spent + run_usd > 0.8 * cap:
            logger.warning(
                "Workspace %s near daily spend cap: $%.2f + $%.2f of $%.2f",
                workspace_id,
                spent,
                run_usd,
                cap,
            )

    execution = repository.add(
        session, Execution(workspace_id=workspace_id, workflow_id=workflow_id, status="pending")
    )

    # Dispatch the run to the worker (by task name — no import of worker code).
    celery_app.send_task(
        "run_workflow",
        args=[str(execution.id), str(workspace_id), workflow.graph, node_id],
    )
    return execution
