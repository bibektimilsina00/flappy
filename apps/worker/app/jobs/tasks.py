"""Long-running jobs. Workers own graph execution, generation, storage, billing."""

import asyncio
import uuid

from sqlmodel import Session

from apps.api.app.core.celery import celery_app
from apps.api.app.core.database import engine
from apps.api.app.core.redis import get_redis
from apps.api.app.execution_engine.engine.event_emitter import EventEmitter
from apps.api.app.execution_engine.engine.run_context import RunContext
from apps.api.app.execution_engine.engine.workflow_runner import run_workflow
from apps.api.app.features.assets import repository as assets_repo
from apps.api.app.features.assets.models import Asset
from apps.api.app.features.billing import service as billing_service
from apps.api.app.features.executions import repository as executions_repo
from apps.api.app.storage.factory import get_storage


def _subgraph(graph: dict, node_id: str) -> dict:
    """Node + all its ancestors, so a single-node run has its inputs."""
    parents: dict[str, list[str]] = {}
    for edge in graph.get("edges", []):
        parents.setdefault(edge["target"], []).append(edge["source"])

    keep: set[str] = set()
    stack = [node_id]
    while stack:
        current = stack.pop()
        if current in keep:
            continue
        keep.add(current)
        stack.extend(parents.get(current, []))

    return {
        "nodes": [n for n in graph.get("nodes", []) if n["id"] in keep],
        "edges": [e for e in graph.get("edges", []) if e["source"] in keep and e["target"] in keep],
    }


@celery_app.task(name="run_clip_op")
def run_clip_op_task(
    execution_id: str, workspace_id: str, workflow_id: str, node_id: str, op: str, src_key: str
) -> None:
    """Run a slow per-clip op (e.g. video background matting) and record the result
    asset against the execution so it joins the workflow's media pool. Reuses the
    Execution status the editor already polls; the op itself lives in clip_ops."""
    from apps.api.app.features.video_editor import clip_ops

    exec_uuid = uuid.UUID(execution_id)
    ws_uuid = uuid.UUID(workspace_id)
    storage = get_storage()
    with Session(engine) as session:
        executions_repo.set_status(session, exec_uuid, "running")
        try:
            key, kind = clip_ops.run_op(storage, op, src_key, ws_uuid, timeout_s=8 * 60)
            assets_repo.add(
                session,
                Asset(
                    workspace_id=ws_uuid,
                    execution_id=exec_uuid,
                    node_id=node_id,
                    kind=kind,
                    key=key,
                    url=storage.url(key),
                    cost=0.0,
                ),
            )
            executions_repo.set_status(session, exec_uuid, "completed", finished=True)
        except Exception as exc:  # noqa: BLE001 — surface as a failed execution
            executions_repo.set_status(session, exec_uuid, "failed", str(exc), finished=True)


@celery_app.task(name="run_transition_morph")
def run_transition_morph_task(
    execution_id: str,
    workspace_id: str,
    workflow_id: str,
    node_id: str,
    from_key: str,
    to_key: str,
    prompt: str,
) -> None:
    """Generate an AI transition morph between two boundary frames and record it as
    an asset against the execution (so it joins the pool). Editor polls the status."""
    from apps.api.app.features.video_editor import clip_ops

    exec_uuid = uuid.UUID(execution_id)
    ws_uuid = uuid.UUID(workspace_id)
    storage = get_storage()
    with Session(engine) as session:
        executions_repo.set_status(session, exec_uuid, "running")
        try:
            key, kind = clip_ops.run_morph(storage, from_key, to_key, prompt, ws_uuid)
            assets_repo.add(
                session,
                Asset(
                    workspace_id=ws_uuid,
                    execution_id=exec_uuid,
                    node_id=node_id,
                    kind=kind,
                    key=key,
                    url=storage.url(key),
                    cost=0.0,
                ),
            )
            executions_repo.set_status(session, exec_uuid, "completed", finished=True)
        except Exception as exc:  # noqa: BLE001
            executions_repo.set_status(session, exec_uuid, "failed", str(exc), finished=True)


@celery_app.task(name="run_talking_character")
def run_talking_character_task(
    execution_id: str,
    workspace_id: str,
    workflow_id: str,
    node_id: str,
    image_key: str,
    script: str,
    voice: str = "",
) -> None:
    """Animate a portrait to speak `script` and record the video against the
    execution (so it joins the pool). Editor polls the status."""
    from apps.api.app.features.video_editor import clip_ops

    exec_uuid = uuid.UUID(execution_id)
    ws_uuid = uuid.UUID(workspace_id)
    storage = get_storage()
    with Session(engine) as session:
        executions_repo.set_status(session, exec_uuid, "running")
        try:
            key, kind = clip_ops.run_talking(
                storage, image_key, script, ws_uuid, voice=voice or None
            )
            assets_repo.add(
                session,
                Asset(
                    workspace_id=ws_uuid,
                    execution_id=exec_uuid,
                    node_id=node_id,
                    kind=kind,
                    key=key,
                    url=storage.url(key),
                    cost=0.0,
                ),
            )
            executions_repo.set_status(session, exec_uuid, "completed", finished=True)
        except Exception as exc:  # noqa: BLE001
            executions_repo.set_status(session, exec_uuid, "failed", str(exc), finished=True)


@celery_app.task(name="run_workflow")
def run_workflow_task(
    execution_id: str, workspace_id: str, graph: dict, node_id: str | None = None
) -> None:
    """Idempotent entrypoint. Streams events; persists status, assets, and usage."""
    if node_id:
        graph = _subgraph(graph, node_id)
    exec_uuid = uuid.UUID(execution_id)
    ws_uuid = uuid.UUID(workspace_id)
    emitter = EventEmitter(execution_id, get_redis())
    storage = get_storage()

    with Session(engine) as session:
        executions_repo.set_status(session, exec_uuid, "running")

        def on_asset(node_id: str, kind: str, key: str, url: str, cost: float) -> None:
            assets_repo.add(
                session,
                Asset(
                    workspace_id=ws_uuid,
                    execution_id=exec_uuid,
                    node_id=node_id,
                    kind=kind,
                    key=key,
                    url=url,
                    cost=cost,
                ),
            )

        def has_credits(cost: float) -> bool:
            return billing_service.has_credits(session, ws_uuid, cost)

        def charge(cost: float, node_id: str, kind: str, usd: float = 0.0) -> None:
            billing_service.charge(session, ws_uuid, exec_uuid, node_id, kind, cost, usd)

        ctx = RunContext(
            execution_id=execution_id,
            workspace_id=workspace_id,
            storage=storage,
            emit=emitter.emit,
            on_asset=on_asset,
            has_credits=has_credits,
            charge=charge,
        )

        # Feed upstream media outputs to a single-node run without re-generating.
        prior: dict[str, dict] = {}
        if node_id:
            execution = executions_repo.get(session, ws_uuid, exec_uuid)
            if execution is not None:
                latest = assets_repo.latest_by_node_for_workflow(session, execution.workflow_id)
                prior = {
                    nid: {"url": storage.url(asset.key)}
                    for nid, asset in latest.items()
                    if asset.key
                }

        status, error = asyncio.run(
            run_workflow(graph, emitter, ctx, run_only=node_id, prior=prior)
        )
        executions_repo.set_status(session, exec_uuid, status, error, finished=True)
