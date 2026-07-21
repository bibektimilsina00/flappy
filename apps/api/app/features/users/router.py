from fastapi import APIRouter, Depends

from apps.api.app.api.deps import get_current_user
from apps.api.app.features.users.models import User
from apps.api.app.features.users.schemas import UserRead

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead)
def read_me(user: User = Depends(get_current_user)):
    return user
