"""Business logic for billing. Routers call service; service calls repository."""

import uuid

from sqlmodel import Session

from apps.api.app.features.billing import repository
from apps.api.app.features.billing.models import UsageRecord


class InsufficientCredits(Exception):
    pass


def seed_workspace(session: Session, workspace_id: uuid.UUID) -> None:
    repository.get_or_create(session, workspace_id)


def get_balance(session: Session, workspace_id: uuid.UUID) -> float:
    return repository.balance(session, workspace_id)


def has_credits(session: Session, workspace_id: uuid.UUID, amount: float) -> bool:
    return repository.balance(session, workspace_id) >= amount


def charge(
    session: Session,
    workspace_id: uuid.UUID,
    execution_id: uuid.UUID,
    node_id: str,
    kind: str,
    cost: float,
    usd: float = 0.0,
) -> None:
    """Deduct atomically and record usage. Raises InsufficientCredits."""
    if not repository.try_deduct(session, workspace_id, cost):
        raise InsufficientCredits(f"Insufficient credits (need {cost})")
    repository.add_usage(
        session,
        UsageRecord(
            workspace_id=workspace_id,
            execution_id=execution_id,
            node_id=node_id,
            kind=kind,
            cost=cost,
            usd=usd,
        ),
    )


def spend_usd(session: Session, workspace_id: uuid.UUID, since=None) -> float:
    """Total real provider spend (USD) for a workspace, optionally since a time."""
    return repository.spend_usd(session, workspace_id, since)
