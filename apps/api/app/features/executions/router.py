import uuid

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    WebSocket,
    WebSocketDisconnect,
)
from sqlmodel import Session

from apps.api.app.api.deps import current_workspace_id, get_session, user_from_token
from apps.api.app.core.redis import get_async_redis
from apps.api.app.features.assets import repository as assets_repo
from apps.api.app.features.assets.schemas import AssetRead
from apps.api.app.features.billing import service as billing_service
from apps.api.app.features.executions import repository, service
from apps.api.app.features.executions.schemas import ExecutionCreate, ExecutionRead
from apps.api.app.features.workflows import repository as workflows_repo
from apps.api.app.features.workspaces import repository as workspaces_repo

router = APIRouter(prefix="/executions", tags=["executions"])


@router.post("", response_model=ExecutionRead, status_code=201)
def create_execution(
    data: ExecutionCreate,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
):
    return service.create_execution(session, workspace_id, data.workflow_id, data.node_id)


@router.get("/estimate")
def estimate_run(
    workflow_id: uuid.UUID = Query(...),
    node_id: str | None = Query(default=None),
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
) -> dict:
    """Credit cost of a run + current balance, so the UI can gate/label it."""
    workflow = workflows_repo.get(session, workspace_id, workflow_id)
    if workflow is None:
        raise HTTPException(status_code=404, detail="Workflow not found")
    cost = service.estimate_cost(workflow.graph, node_id)
    balance = billing_service.get_balance(session, workspace_id)
    return {"cost": cost, "balance": balance, "affordable": cost <= balance}


@router.get("", response_model=list[ExecutionRead])
def list_executions(
    workflow_id: uuid.UUID = Query(...),
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
):
    return repository.list_for_workflow(session, workspace_id, workflow_id)


@router.get("/{execution_id}", response_model=ExecutionRead)
def get_execution(
    execution_id: uuid.UUID,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
):
    execution = repository.get(session, workspace_id, execution_id)
    if execution is None:
        raise HTTPException(status_code=404, detail="Execution not found")
    return execution


@router.get("/{execution_id}/assets", response_model=list[AssetRead])
def list_assets(
    execution_id: uuid.UUID,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
):
    return assets_repo.list_for_execution(session, execution_id)


@router.websocket("/{execution_id}/ws")
async def execution_stream(
    websocket: WebSocket,
    execution_id: str,
    token: str = Query(...),
    session: Session = Depends(get_session),
):
    # Browsers can't set WS auth headers — authenticate via ?token= (Clerk or legacy).
    user = user_from_token(session, token)
    if user is None:
        await websocket.close(code=1008)
        return
    workspace = workspaces_repo.get_by_owner(session, user.id)
    execution = (
        repository.get(session, workspace.id, uuid.UUID(execution_id)) if workspace else None
    )
    if execution is None:
        await websocket.close(code=1008)
        return

    await websocket.accept()
    redis = get_async_redis()
    pubsub = redis.pubsub()
    await pubsub.subscribe(f"exec:{execution_id}")

    try:
        # Replay whatever already happened, then stream live.
        for raw in await redis.lrange(f"exec:{execution_id}:log", 0, -1):
            await websocket.send_text(raw)
        async for message in pubsub.listen():
            if message["type"] == "message":
                await websocket.send_text(message["data"])
    except WebSocketDisconnect:
        pass
    finally:
        await pubsub.unsubscribe(f"exec:{execution_id}")
        await pubsub.aclose()
        await redis.aclose()
