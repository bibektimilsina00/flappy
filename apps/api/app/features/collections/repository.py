import uuid
from datetime import UTC, datetime

from sqlmodel import Session, select

from apps.api.app.features.collections.models import Collection


def list_by_workspace(session: Session, workspace_id: uuid.UUID) -> list[Collection]:
    return list(
        session.exec(
            select(Collection)
            .where(Collection.workspace_id == workspace_id)
            .order_by(Collection.created_at)
        )
    )


def get(session: Session, workspace_id: uuid.UUID, collection_id: uuid.UUID) -> Collection | None:
    c = session.get(Collection, collection_id)
    return c if c and c.workspace_id == workspace_id else None


def add(session: Session, collection: Collection) -> Collection:
    session.add(collection)
    session.commit()
    session.refresh(collection)
    return collection


def save(session: Session, collection: Collection) -> Collection:
    collection.updated_at = datetime.now(UTC)
    session.add(collection)
    session.commit()
    session.refresh(collection)
    return collection


def delete(session: Session, collection: Collection) -> None:
    session.delete(collection)
    session.commit()
