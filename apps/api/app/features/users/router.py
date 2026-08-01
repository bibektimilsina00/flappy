from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session

from apps.api.app.api.deps import get_current_user, get_session
from apps.api.app.core.security import hash_password, verify_password
from apps.api.app.features.users.models import User
from apps.api.app.features.users.schemas import UserRead

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead)
def read_me(user: User = Depends(get_current_user)):
    return user


class UpdateMe(BaseModel):
    name: str


@router.patch("/me", response_model=UserRead)
def update_me(
    body: UpdateMe,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    name = body.name.strip()[:80]
    if not name:
        raise HTTPException(status_code=422, detail="Name can't be empty.")
    user.name = name
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


class ChangePassword(BaseModel):
    current_password: str
    new_password: str


@router.post("/me/password", status_code=204)
def change_password(
    body: ChangePassword,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if user.hashed_password is None:
        raise HTTPException(
            status_code=400, detail=f"This account signs in with {user.auth_provider}."
        )
    if not verify_password(body.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    if len(body.new_password) < 8:
        raise HTTPException(status_code=422, detail="New password needs at least 8 characters.")
    user.hashed_password = hash_password(body.new_password)
    session.add(user)
    session.commit()
