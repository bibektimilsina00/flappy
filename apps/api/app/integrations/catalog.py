"""Static catalog. Everything real is discovered live from OpenRouter (see
openrouter_catalog). The only static entry is the `world` node's stub — it has
no provider yet and is hidden in the UI. `provider` is the model's maker (UI
icon only); `adapter` picks the backend."""

from apps.api.app.integrations.base.model_spec import ModelSpec

MODELS: list[ModelSpec] = [
    # ── World (stub — no provider yet, hidden in UI) ──────
    ModelSpec(
        id="marble",
        name="Marble",
        kind="world",
        adapter="stub",
        provider="worldlabs",
        cost=8,
        default=True,
    ),
]
