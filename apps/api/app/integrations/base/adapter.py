from dataclasses import dataclass, field
from typing import Protocol, runtime_checkable

from apps.api.app.integrations.base.model_spec import ModelSpec


@dataclass
class GenerationRequest:
    kind: str
    prompt: str | None
    inputs: dict = field(default_factory=dict)  # upstream node outputs
    params: dict = field(default_factory=dict)  # resolved (model defaults + node overrides)


@dataclass
class GenerationResult:
    kind: str
    cost: float
    key: str | None = None  # stable storage object key (media); presigned on demand
    text: str | None = None  # text output


def compose_prompt(request: "GenerationRequest") -> str:
    """Upstream text input prepended to the node's own prompt."""
    parts: list[str] = []
    upstream = request.inputs.get("text")
    if isinstance(upstream, str) and upstream.strip():
        parts.append(upstream.strip())
    if request.prompt:
        parts.append(request.prompt)
    return "\n\n".join(parts) or "Generate a creative result."


@runtime_checkable
class Adapter(Protocol):
    """One integration per external API. Models on the same API share one adapter.
    Add a new API => write one Adapter; add a model on an existing API => just a
    ModelSpec in the catalog."""

    def estimate_cost(self, model: ModelSpec, request: GenerationRequest) -> float: ...

    def generate(self, model: ModelSpec, request: GenerationRequest, ctx) -> GenerationResult: ...
