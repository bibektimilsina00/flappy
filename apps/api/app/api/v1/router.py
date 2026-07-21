from fastapi import APIRouter

from apps.api.app.features.assets.router import router as assets_router
from apps.api.app.features.auth.router import router as auth_router
from apps.api.app.features.billing.router import router as billing_router
from apps.api.app.features.dashboard.router import router as dashboard_router
from apps.api.app.features.executions.router import router as executions_router
from apps.api.app.features.models.router import router as models_router
from apps.api.app.features.nodes.router import router as nodes_router
from apps.api.app.features.settings.router import router as settings_router
from apps.api.app.features.templates.router import router as templates_router
from apps.api.app.features.users.router import router as users_router
from apps.api.app.features.workflows.router import router as workflows_router
from apps.api.app.features.workspaces.router import router as workspaces_router

api_router = APIRouter()

for r in (
    auth_router,
    users_router,
    workspaces_router,
    workflows_router,
    executions_router,
    assets_router,
    templates_router,
    nodes_router,
    models_router,
    billing_router,
    dashboard_router,
    settings_router,
):
    api_router.include_router(r)
