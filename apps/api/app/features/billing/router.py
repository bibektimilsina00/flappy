import json
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session

from apps.api.app.api.deps import current_workspace_id, get_current_user, get_session
from apps.api.app.features.billing import dodo, service
from apps.api.app.features.billing.schemas import BalanceRead
from apps.api.app.features.users.models import User
from apps.api.app.features.workspaces import repository as workspaces_repo

router = APIRouter(prefix="/billing", tags=["billing"])


@router.post("/upgrade")
def start_upgrade(
    user: User = Depends(get_current_user),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
) -> dict:
    """Hosted checkout URL for the Pro subscription."""
    if not dodo.enabled():
        raise HTTPException(status_code=503, detail="Payments are not configured yet.")
    try:
        return {"checkout_url": dodo.create_pro_checkout(user, workspace_id)}
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
