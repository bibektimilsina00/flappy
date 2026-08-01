"""DB queries for billing. Keep all SQL here; service.py calls into it."""

import uuid
from datetime import datetime

from sqlalchemy import func, update
from sqlmodel import Session, select

from apps.api.app.features.billing.models import Credit, UsageRecord


def get_or_create(session: Session, workspace_id: uuid.UUID) -> Credit:
    credit = session.exec(select(Credit).where(Credit.workspace_id == workspace_id)).first()
    if credit is None:
        credit = Credit(workspace_id=workspace_id)
        session.add(credit)
        session.commit()
        session.refresh(credit)
    return credit


def add_credits(session: Session, workspace_id: uuid.UUID, amount: float) -> None:
    get_or_create(session, workspace_id)
    session.exec(
        update(Credit)
        .where(Credit.workspace_id == workspace_id)
        .values(balance=Credit.balance + amount)
    )
    session.commit()


def balance(session: Session, workspace_id: uuid.UUID) -> float:
    credit = session.exec(select(Credit).where(Credit.workspace_id == workspace_id)).first()
    return credit.balance if credit else 0.0


def try_deduct(session: Session, workspace_id: uuid.UUID, amount: float) -> bool:
    """Atomic deduct-with-check. Returns False if the balance is insufficient."""
    result = session.exec(
        update(Credit)
        .where(Credit.workspace_id == workspace_id, Credit.balance >= amount)
        .values(balance=Credit.balance - amount)
    )
    session.commit()
    return result.rowcount == 1


def add_usage(session: Session, usage: UsageRecord) -> None:
    session.add(usage)
    session.commit()


def spend_usd(session: Session, workspace_id: uuid.UUID, since: datetime | None = None) -> float:
    query = select(func.coalesce(func.sum(UsageRecord.usd), 0.0)).where(
        UsageRecord.workspace_id == workspace_id
    )
    if since is not None:
        query = query.where(UsageRecord.created_at >= since)
    return float(session.exec(query).one())


def recent_usage(session: Session, workspace_id: uuid.UUID, limit: int = 50) -> list[UsageRecord]:
    return list(
        session.exec(
            select(UsageRecord)
            .where(UsageRecord.workspace_id == workspace_id)
            .order_by(UsageRecord.created_at.desc())  # type: ignore[attr-defined]
            .limit(limit)
        )
    )
