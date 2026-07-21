import uuid
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any


@dataclass
class NodeContext:
    """Everything a node needs at run time, injected by the executor."""

    execution_id: uuid.UUID
    workspace_id: uuid.UUID
    secrets: dict[str, str] = field(default_factory=dict)
    # storage handle + progress emitter are wired by the engine
    storage: Any = None
    emit: Callable[[str, dict], None] = lambda event, payload: None
