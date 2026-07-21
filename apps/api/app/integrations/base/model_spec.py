from dataclasses import dataclass, field
from typing import Any


@dataclass
class ParamSpec:
    """One tunable parameter for a model; the UI renders a control from this."""

    key: str
    label: str
    type: str  # "select" | "number"
    default: Any
    options: list[str] | None = None  # for select
    min: float | None = None  # for number
    max: float | None = None


@dataclass
class ModelSpec:
    id: str
    name: str
    kind: str  # text | image | video | audio | world
    adapter: str  # which Adapter runs it
    provider: str  # brand for the UI (icon/label)
    cost: float  # base credits per generation
    default: bool = False
    usd: float = 0.0  # est. real provider cost per generation (for spend tracking)
    family: str | None = None  # UI group, e.g. "Wan" / "Kling" (video)
    mode: str | None = None  # UI capability tag: "t2v" | "i2v" | "ref"
    icon_url: str | None = None  # per-model thumbnail (e.g. Replicate cover image)
    description: str | None = None  # one-line blurb shown in the picker
    params: list[ParamSpec] = field(default_factory=list)
    config: dict = field(default_factory=dict)  # adapter-specific settings
