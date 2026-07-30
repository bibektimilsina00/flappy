from collections.abc import Callable
from dataclasses import dataclass
from typing import Any


@dataclass
class RunContext:
    """Everything a run needs, wired by the worker so the engine stays decoupled
    from FastAPI, the DB, and storage internals."""

    execution_id: str
    workspace_id: str
    storage: Any
    emit: Callable[..., None]
    on_asset: Callable[[str, str, str, str, float], None]  # node_id, kind, key, url, cost
    has_credits: Callable[[float], bool]
    charge: Callable[..., None]  # cost, node_id, kind, usd
