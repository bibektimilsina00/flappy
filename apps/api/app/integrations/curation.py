"""Curation & tiering, applied on top of the (mostly dynamic) catalog.

- featured: a small, hand-picked shortlist shown by default in the picker (the
  long tail is behind "show all"). Defined by CURATED specs per kind — each spec
  is a set of id substrings; we pick the cleanest (shortest-id) match, which
  favours the canonical model over -fast / -preview / dated variants.
- free: usable on the free plan; everything else is premium (upgrade to unlock).
  Tiered by cost — cheap models are free, expensive flagships aren't.
"""

from apps.api.app.integrations.base.model_spec import ModelSpec

# A curated combination per kind: latest flagships + a few cheap/free ones.
# Each entry is a list of substrings that must ALL appear in the model id.
_CURATED: dict[str, list[list[str]]] = {
    # Pinned to current flagship versions — bump these as new models ship.
    "text": [
        ["google/gemini-3.5-flash"],      # Gemini Flash (latest, cheap)
        ["google/gemini-3.1-pro"],        # Gemini Pro (latest)
        ["openai/gpt-5-mini"],            # GPT-5 mini (cheap)
        ["openai/gpt-5"],                 # GPT-5 (flagship)
        ["deepseek/deepseek-v4-flash"],   # DeepSeek Flash (cheap)
        ["deepseek/deepseek-v4-pro"],     # DeepSeek Pro
        ["x-ai/grok-4.5"],                # Grok
        ["meta-llama/llama-4-maverick"],  # Llama (cheap)
        ["qwen/qwen3.7-max"],             # Qwen
        ["moonshotai/kimi-k3"],           # Kimi
        ["mistralai/mistral-medium"],     # Mistral
        ["minimax/minimax-m3"],           # MiniMax
    ],
    # OpenRouter slugs. Each spec resolves to the cleanest (shortest-id) match.
    "image": [
        ["gemini-2.5-flash-image"],   # Nano Banana (cheap default)
        ["gemini-3.1-flash-image"],   # Nano Banana 2
        ["gemini-3-pro-image"],       # Nano Banana Pro
        ["flux.2-flex"], ["flux.2-pro"],
        ["gpt-image-1"], ["seedream-4"], ["recraft-v3"],
        ["krea-2-large"], ["grok-imagine-image"],
    ],
    "video": [
        ["veo-3.1-lite"], ["veo-3.1"], ["sora-2"], ["kling-v3.0-pro"],
        ["seedance-1-5-pro"], ["seedance-2.0"], ["wan-2.7"], ["hailuo"],
    ],
    "audio": [
        ["kokoro"],                   # cheapest TTS
        ["gemini-3.1-flash-tts"],     # premium TTS
        ["aura-2"], ["grok-voice-tts"],
        ["lyria-3-clip"], ["lyria-3-pro"], ["gpt-audio-mini"],  # music
    ],
}

# How many models are free (usable on the free plan) per kind — the cheapest N.
_FREE_COUNT = {"text": 2, "image": 2, "video": 1, "audio": 2, "world": 1}
# Never free — flagship/premium tiers, even if their bucketed cost is low.
_NEVER_FREE = ("pro", "max", "ultra", "opus", "sonnet")


def free_ids(models: list[ModelSpec]) -> set[str]:
    """The cheapest N non-flagship models of each kind are free; rest are premium.
    Computed over the featured set so 'free' is always a curated model."""
    featured = featured_ids(models)
    by_kind: dict[str, list[ModelSpec]] = {}
    for m in models:
        if m.id in featured and not any(k in m.id.lower() for k in _NEVER_FREE):
            by_kind.setdefault(m.kind, []).append(m)

    ids: set[str] = set()
    for kind, pool in by_kind.items():
        pool.sort(key=lambda m: (m.usd, m.cost, m.id))  # finer than bucketed cost
        for m in pool[: _FREE_COUNT.get(kind, 1)]:
            ids.add(m.id)
    return ids


def featured_ids(models: list[ModelSpec]) -> set[str]:
    """Resolve each curated spec to the cleanest matching model id."""
    by_kind: dict[str, list[ModelSpec]] = {}
    for m in models:
        by_kind.setdefault(m.kind, []).append(m)

    ids: set[str] = set()
    for kind, specs in _CURATED.items():
        pool = by_kind.get(kind, [])
        for spec in specs:
            matches = [m for m in pool if all(s in m.id.lower() for s in spec)]
            if matches:
                ids.add(min(matches, key=lambda m: len(m.id)).id)
    return ids
