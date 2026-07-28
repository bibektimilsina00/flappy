import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session

from apps.api.app.api.deps import current_workspace_id, get_current_user, get_session
from apps.api.app.features.collections import repository
from apps.api.app.features.collections.models import Collection
from apps.api.app.features.users.models import User

router = APIRouter(prefix="/collections", tags=["collections"])


def _read(c: Collection) -> dict:
    return {
        "id": str(c.id),
        "name": c.name,
        "asset_ids": c.asset_ids or [],
        "created_at": c.created_at.isoformat(),
        "updated_at": c.updated_at.isoformat(),
    }


@router.get("")
def list_collections(
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> list[dict]:
    return [_read(c) for c in repository.list_by_workspace(session, workspace_id)]


class CreateBody(BaseModel):
    name: str = "Untitled"


@router.post("", status_code=status.HTTP_201_CREATED)
def create_collection(
    body: CreateBody,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    c = Collection(workspace_id=workspace_id, name=(body.name.strip() or "Untitled"), asset_ids=[])
    return _read(repository.add(session, c))


class UpdateBody(BaseModel):
    name: str | None = None
    add: list[str] | None = None
    remove: list[str] | None = None


@router.patch("/{collection_id}")
def update_collection(
    collection_id: uuid.UUID,
    body: UpdateBody,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    c = repository.get(session, workspace_id, collection_id)
    if c is None:
        raise HTTPException(status_code=404, detail="Collection not found")
    if body.name is not None and body.name.strip():
        c.name = body.name.strip()
    ids = list(c.asset_ids or [])
    if body.remove:
        rem = set(body.remove)
        ids = [i for i in ids if i not in rem]
    if body.add:
        have = set(ids)
        ids += [i for i in body.add if i not in have]
    c.asset_ids = ids  # reassign so the JSON column persists
    return _read(repository.save(session, c))


@router.delete("/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_collection(
    collection_id: uuid.UUID,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> None:
    c = repository.get(session, workspace_id, collection_id)
    if c is None:
        raise HTTPException(status_code=404, detail="Collection not found")
    repository.delete(session, c)
