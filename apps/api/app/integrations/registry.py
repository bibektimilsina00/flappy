"""Model + adapter registry. list_models/resolve_model over the catalog, and
get_adapter over the adapter instances."""

from dataclasses import asdict

from apps.api.app.integrations.adapters.openrouter import OpenRouterAdapter
from apps.api.app.integrations.adapters.stub import StubAdapter
from apps.api.app.integrations.base.adapter import Adapter
from apps.api.app.integrations.base.model_spec import ModelSpec
from apps.api.app.integrations.catalog import MODELS
from apps.api.app.integrations.curation import featured_ids, free_ids
from apps.api.app.integrations.openrouter_catalog import (
    openrouter_audio_models,
    openrouter_image_models,
    openrouter_text_models,
    openrouter_video_models,
)

# OpenRouter is the only inference host. `stub` remains only for the world node,
# which has no provider yet (hidden in the UI). Direct Gemini/OpenAI + Replicate
# were retired — they return when we ship bring-your-own-key.
_ADAPTERS: dict[str, Adapter] = {
    "stub": StubAdapter(),
    "openrouter": OpenRouterAdapter(),
}


def _catalog() -> list[ModelSpec]:
    """Static catalog (world stub) + every OpenRouter modality, live + cached."""
    return (
        MODELS
        + openrouter_text_models()
        + openrouter_image_models()
        + openrouter_video_models()
        + openrouter_audio_models()
    )


_featured_cache: set[str] | None = None
_free_cache: set[str] | None = None


def _featured() -> set[str]:
    global _featured_cache
    if _featured_cache is None:
        _featured_cache = featured_ids(_catalog())
    return _featured_cache


def _free() -> set[str]:
    global _free_cache
    if _free_cache is None:
        _free_cache = free_ids(_catalog())
    return _free_cache


def is_free(model: ModelSpec) -> bool:
    return model.id in _free()


def list_models(kind: str | None = None) -> list[ModelSpec]:
    return [m for m in _catalog() if kind is None or m.kind == kind]


def get_model(model_id: str) -> ModelSpec | None:
    return next((m for m in _catalog() if m.id == model_id), None)


def default_model(kind: str) -> ModelSpec | None:
    """The first model of the kind as the UI shows it: the top free model, else
    the first featured one. Matches the model selector's first row so a fresh
    node's selection and its actual run model always agree."""
    featured = [m for m in _catalog() if m.kind == kind and m.id in _featured()]
    pool = featured or [m for m in _catalog() if m.kind == kind]
    if not pool:
        return None
    explicit = next((m for m in pool if m.default), None)
    if explicit:
        return explicit
    free = _free()
    return next((m for m in pool if m.id in free), pool[0])


def resolve_model(kind: str, model_id: str | None) -> ModelSpec | None:
    """Chosen model (by id) if it matches the node kind, else the kind default."""
    if model_id:
        model = get_model(model_id)
        if model and model.kind == kind:
            return model
    return default_model(kind)


def get_adapter(key: str) -> Adapter:
    return _ADAPTERS[key]


# Rough real-provider cost (USD) per generation, by kind, when a model doesn't
# carry its own `usd`. Used only for spend tracking, never billed to the user.
_KIND_USD = {"text": 0.001, "image": 0.04, "audio": 0.02, "video": 0.30, "world": 0.05}


def provider_usd(model: ModelSpec) -> float:
    return model.usd if model.usd > 0 else _KIND_USD.get(model.kind, 0.0)


def model_to_dict(model: ModelSpec) -> dict:
    data = asdict(model)
    data.pop("config", None)  # internal — not exposed to the UI
    data.pop("adapter", None)  # internal — never leak the inference host
    data.pop("usd", None)  # internal — never surface real COGS
    data["featured"] = model.id in _featured()
    data["free"] = is_free(model)
    return data
