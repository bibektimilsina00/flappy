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


def list_for_workspace(session: Session, workspace_id: uuid.UUID, limit: int = 300) -> list[Asset]:
    """Every asset the workspace has produced, newest first."""
    return list(
        session.exec(
            select(Asset)
            .where(Asset.workspace_id == workspace_id)
            .order_by(Asset.created_at.desc())
            .limit(limit)
        )
    )


def media_assets_for_workspace(
    session: Session, workspace_id: uuid.UUID, workflow_id: uuid.UUID | None = None
) -> dict[uuid.UUID, list[Asset]]:
    """image/video assets grouped by workflow_id, newest first. Assets link to a
    workflow through Execution. Pass workflow_id to scope to one workflow."""
    where = [Asset.workspace_id == workspace_id, Asset.kind.in_(("image", "video"))]
    if workflow_id is not None:
        where.append(Execution.workflow_id == workflow_id)
    rows = session.exec(
        select(Asset, Execution.workflow_id)
        .join(Execution, Asset.execution_id == Execution.id)
        .where(*where)
        .order_by(Asset.created_at.desc())
    )
    out: dict[uuid.UUID, list[Asset]] = {}
    for asset, wf_id in rows:
        if asset.key:
            out.setdefault(wf_id, []).append(asset)
    return out


_KIND_BY_EXT = {
    **dict.fromkeys(("png", "jpg", "jpeg", "webp", "gif", "avif"), "image"),
    **dict.fromkeys(("mp4", "webm", "mov", "m4v", "mkv"), "video"),
    **dict.fromkeys(("mp3", "wav", "m4a", "ogg", "aac", "flac", "weba"), "audio"),
}


def kind_from_key(key: str) -> str | None:
    """image/video/audio inferred from a storage key's extension (for uploaded media,
    which carries no `kind` of its own)."""
    ext = key.rsplit(".", 1)[-1].lower() if "." in key else ""
    return _KIND_BY_EXT.get(ext)


def all_for_workflow(session: Session, workflow_id: uuid.UUID) -> list[Asset]:
    """Every media asset a workflow ever generated (via its executions), in
    generation order. `id` breaks ties — batch generations share a created_at,
    which otherwise makes the editor's media pool order non-deterministic."""
    rows = session.exec(
        select(Asset)
        .join(Execution, Asset.execution_id == Execution.id)
        .where(Execution.workflow_id == workflow_id, Asset.kind.in_(("image", "video", "audio")))
        .order_by(Asset.created_at.asc(), Asset.id.asc())
    )
    return [a for a in rows if a.key]


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
