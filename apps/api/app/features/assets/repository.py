"""DB queries for assets. Keep all SQL here; service.py calls into it."""

import uuid

from sqlmodel import Session, select

from apps.api.app.features.assets.models import Asset
from apps.api.app.features.executions.models import Execution


def add(session: Session, asset: Asset) -> Asset:
    session.add(asset)
    session.commit()
    session.refresh(asset)
    return asset


def list_for_execution(session: Session, execution_id: uuid.UUID) -> list[Asset]:
    return list(session.exec(select(Asset).where(Asset.execution_id == execution_id)))


def latest_by_node_for_workflow(
    session: Session, workflow_id: uuid.UUID
) -> dict[str, Asset]:
    """The most recent asset each node produced across all runs of a workflow."""
    rows = session.exec(
        select(Asset)
        .join(Execution, Asset.execution_id == Execution.id)
        .where(Execution.workflow_id == workflow_id)
        .order_by(Asset.created_at)
    )
    latest: dict[str, Asset] = {}
    for asset in rows:  # ordered oldest→newest, so last write per node wins
        latest[asset.node_id] = asset
    return latest
