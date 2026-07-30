import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends
from sqlmodel import Session

from apps.api.app.api.deps import current_workspace_id, get_session
from apps.api.app.features.billing import service
from apps.api.app.features.billing.schemas import BalanceRead
from apps.api.app.features.workspaces import repository as workspaces_repo

router = APIRouter(prefix="/billing", tags=["billing"])


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
