import json
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlmodel import Session

from apps.api.app.api.deps import current_workspace_id, get_current_user, get_session
from apps.api.app.features.billing import dodo, plans, service
from apps.api.app.features.billing.schemas import BalanceRead
from apps.api.app.features.users.models import User
from apps.api.app.features.workspaces import repository as workspaces_repo

router = APIRouter(prefix="/billing", tags=["billing"])


class UpgradeRequest(BaseModel):
    tier: str = "pro"


@router.post("/upgrade")
def start_upgrade(
    body: UpgradeRequest,
    user: User = Depends(get_current_user),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    session: Session = Depends(get_session),
) -> dict:
    """Hosted checkout URL for a paid tier (plus | pro | ultra | studio_*)."""
    if body.tier not in plans.PAID_TIERS:
        raise HTTPException(status_code=422, detail="Unknown plan.")
    if not dodo.enabled():
        raise HTTPException(status_code=503, detail="Payments are not configured yet.")
    ws = workspaces_repo.get(session, workspace_id)
    if ws and ws.plan != "free":
        # No double subscriptions — tier changes go through support/Dodo for now.
        raise HTTPException(status_code=409, detail="Already on a paid plan.")
    try:
        return {"checkout_url": dodo.create_checkout(user, workspace_id, body.tier)}
    except Exception as exc:
        raise HTTPException(
            status_code=502, detail="Could not start checkout — try again."
        ) from exc


@router.post("/webhook")
async def dodo_webhook(request: Request, session: Session = Depends(get_session)) -> dict:
    """Dodo Payments webhook — signature-verified, idempotent."""
    body = await request.body()
    headers = {k.lower(): v for k, v in request.headers.items()}
    if not dodo.verify_signature(body, headers):
        raise HTTPException(status_code=401, detail="Invalid signature")
    dodo.handle_event(session, json.loads(body), headers.get("webhook-id", ""))
    return {"received": True}


@router.post("/cancel", status_code=204)
def cancel_subscription(
    _user: User = Depends(get_current_user),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    session: Session = Depends(get_session),
):
    """Cancel at period end — access and credits keep until then; the webhook
    downgrades the plan when Dodo ends the subscription."""
    ws = workspaces_repo.get(session, workspace_id)
    if ws is None or ws.plan == "free":
        raise HTTPException(status_code=400, detail="No active subscription.")
    if not ws.subscription_id:
        raise HTTPException(
            status_code=400,
            detail="Subscription reference missing — email hello@riocut.studio to cancel.",
        )
    try:
        dodo.cancel_subscription(ws.subscription_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Could not cancel — try again.") from exc


@router.get("/usage")
def usage_history(
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> list[dict]:
    """The credits ledger: most recent charges, newest first."""
    from apps.api.app.features.billing.repository import recent_usage

    return [
        {
            "created_at": u.created_at.isoformat(),
            "kind": u.kind,
            "label": u.node_id,
            "credits": u.cost,
        }
        for u in recent_usage(session, workspace_id)
    ]


@router.get("/balance", response_model=BalanceRead)
def get_balance(
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
):
    workspace = workspaces_repo.get(session, workspace_id)
    plan = workspace.plan if workspace else "free"
    return BalanceRead(balance=service.get_balance(session, workspace_id), plan=plan)


@router.get("/spend")
def get_spend(
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
) -> dict:
    """Real provider spend (USD) over rolling windows — the observability view."""
    now = datetime.now(UTC)
    return {
        "today": service.spend_usd(session, workspace_id, now - timedelta(days=1)),
        "week": service.spend_usd(session, workspace_id, now - timedelta(days=7)),
        "month": service.spend_usd(session, workspace_id, now - timedelta(days=30)),
        "total": service.spend_usd(session, workspace_id),
    }
