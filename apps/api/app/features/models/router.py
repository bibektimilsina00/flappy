from fastapi import APIRouter, Depends, Query

from apps.api.app.api.deps import get_current_user
from apps.api.app.features.users.models import User
from apps.api.app.integrations.registry import list_models, model_to_dict

router = APIRouter(prefix="/models", tags=["models"])


@router.get("")
def get_models(
    kind: str | None = Query(default=None),
    _user: User = Depends(get_current_user),
):
    """The curated catalog for the UI (featured models only), by node kind."""
    return [m for m in (model_to_dict(model) for model in list_models(kind)) if m["featured"]]
