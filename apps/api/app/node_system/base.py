from abc import ABC, abstractmethod
from dataclasses import dataclass, field

from apps.api.app.node_system.context import NodeContext


@dataclass
class NodeIO:
    name: str
    type: str  # "text" | "image" | "video" | "audio"


@dataclass
class NodeMetadata:
    type: str          # unique key, e.g. "video_generate"
    title: str
    category: str
    inputs: list[NodeIO] = field(default_factory=list)
    outputs: list[NodeIO] = field(default_factory=list)


class Node(ABC):
    """One node = one class. metadata declares it; execute runs it."""

    metadata: NodeMetadata

    @abstractmethod
    async def execute(self, inputs: dict, ctx: NodeContext) -> dict:
        """Return outputs keyed by output name."""
        ...
