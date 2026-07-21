"""Media catalog built from Replicate collections, with params generated from
each model's input schema. Cached per process.

For each node kind we read a Replicate collection, take the top models, fetch
each model's `openapi_schema`, and turn its inputs into ParamSpecs — so the
catalog and the settings panel are self-describing. Any failure yields [] so the
rest of the app keeps working.
"""

import httpx

from apps.api.app.core.config import settings
from apps.api.app.integrations.base.model_spec import ModelSpec, ParamSpec

BASE = "https://api.replicate.com/v1"

# node kind -> Replicate collection slug (used when a kind isn't hand-pinned).
_COLLECTIONS = {
    "video": "text-to-video",
    "audio": "text-to-speech",
}
# Hand-pinned flagship models per kind: {kind: [(owner/name, cost), ...]}.
# Guarantees a strong lineup instead of whatever the collection surfaces.
_PINNED = {
    "image": [
        ("black-forest-labs/flux-schnell", 3),
        ("qwen/qwen-image", 4),
        ("black-forest-labs/flux-1.1-pro", 7),
        ("bytedance/seedream-4", 6),
        ("ideogram-ai/ideogram-v3-turbo", 6),
        ("recraft-ai/recraft-v3", 6),
    ],
    "video": [
        ("wan-video/wan-2.2-t2v-fast", 15),
        ("bytedance/seedance-1-lite", 18),
        ("pixverse/pixverse-v5", 20),
        ("minimax/hailuo-02", 22),
        ("kwaivgi/kling-v2.5-turbo-pro", 25),
        ("bytedance/seedance-1-pro", 25),
    ],
    "audio": [
        ("minimax/speech-02-turbo", 3),   # TTS
        ("resemble-ai/chatterbox", 3),    # TTS
        ("meta/musicgen", 4),             # music
        ("minimax/music-1.5", 5),         # music
    ],
}
_PER_KIND = 12  # cap collection models per kind so boot stays fast

# Map a model name/id keyword -> real maker slug (must match a UI icon). Replicate
# owners are usually uploaders, not makers, so we infer the brand from the name and
# fall back to "replicate" (the generic Replicate logo) — never iconless.
_MAKER = [
    # Specific brand names first (so e.g. "imagen" isn't caught by a generic substring).
    ("imagen", "google"), ("veo", "google"), ("gemini", "google"),
    ("sora", "openai"), ("dall-e", "openai"), ("gpt-image", "openai"),
    ("hunyuan", "tencent"), ("kling", "kling"), ("flux", "flux"),
    ("seedream", "bytedance"), ("seedance", "bytedance"), ("doubao", "doubao"),
    ("hailuo", "hailuo"), ("minimax", "minimax"), ("pixverse", "pixverse"),
    ("vidu", "vidu"), ("qwen", "qwen"), ("ideogram", "ideogram"), ("recraft", "recraft"),
    ("photon", "luma"), ("ray-", "luma"), ("luma", "luma"), ("pika", "pika"),
    ("runway", "runway"),
    ("sdxl", "stability"), ("stable-diffusion", "stability"), ("sd3", "stability"),
    ("suno", "suno"), ("udio", "udio"), ("elevenlabs", "elevenlabs"),
    ("musicgen", "meta"), ("llama", "meta"), ("tripo", "tripo"), ("meshy", "meshy"),
    ("wan", "alibaba"),
]


def _maker(model_id: str) -> str:
    low = model_id.lower()
    return next((slug for kw, slug in _MAKER if kw in low), "replicate")


_PROMPT_FIELDS = {"prompt", "text", "text_input", "description"}
_IMAGE_FIELDS = {"image", "input_image", "image_input", "start_image", "subject"}
# inputs that are plumbing, not user-facing tunables
_SKIP = _PROMPT_FIELDS | _IMAGE_FIELDS | {"seed", "negative_prompt", "mask", "num_outputs"}

_cache: dict[str, list[ModelSpec]] = {}


def replicate_models(kind: str) -> list[ModelSpec]:
    if kind in _cache:
        return _cache[kind]
    if not settings.replicate_api_key:
        _cache[kind] = []
    elif kind in _PINNED:
        _cache[kind] = _fetch_pinned(kind, _PINNED[kind])
    elif kind in _COLLECTIONS:
        _cache[kind] = _fetch_collection(kind, _COLLECTIONS[kind])
    else:
        _cache[kind] = []
    return _cache[kind]


def _fetch_pinned(kind: str, pins: list[tuple[str, int]]) -> list[ModelSpec]:
    headers = {"Authorization": f"Bearer {settings.replicate_api_key}"}
    models: list[ModelSpec] = []
    try:
        with httpx.Client(timeout=20, headers=headers) as client:
            for model_id, cost in pins:
                r = client.get(f"{BASE}/models/{model_id}")
                if r.status_code != 200:
                    continue
                m = _build(kind, r.json(), cost)
                if m:
                    models.append(m)
    except Exception:
        return []
    return models


def _fetch_collection(kind: str, slug: str) -> list[ModelSpec]:
    headers = {"Authorization": f"Bearer {settings.replicate_api_key}"}
    try:
        with httpx.Client(timeout=20, headers=headers) as client:
            col = client.get(f"{BASE}/collections/{slug}")
            col.raise_for_status()
            models: list[ModelSpec] = []
            for entry in (col.json().get("models") or [])[:_PER_KIND]:
                if not entry.get("latest_version"):
                    detail = client.get(f"{BASE}/models/{entry['owner']}/{entry['name']}")
                    entry = detail.json() if detail.status_code == 200 else entry
                m = _build(kind, entry, _cost(kind))
                if m:
                    models.append(m)
            return models
    except Exception:
        return []


def _build(kind: str, detail: dict, cost: int) -> ModelSpec | None:
    owner, name = detail.get("owner"), detail.get("name")
    if not owner or not name:
        return None
    schema = (detail.get("latest_version") or {}).get("openapi_schema")
    params, prompt_field, image_field = _parse_schema(schema)
    return ModelSpec(
        id=f"{owner}/{name}",
        name=name.replace("-", " ").title(),
        kind=kind,
        adapter="replicate",
        provider=_maker(f"{owner}/{name}"),
        cost=cost,
        icon_url=detail.get("cover_image_url"),
        description=_desc(detail.get("description")),
        params=params,
        config={
            "model": f"{owner}/{name}",
            "prompt_field": prompt_field,
            **({"image_field": image_field} if image_field else {}),
        },
    )


def _desc(text: str | None) -> str | None:
    if not text:
        return None
    first = text.strip().split(". ")[0].strip().rstrip(".")
    return (first[:110] + "…") if len(first) > 110 else first


def _parse_schema(schema: dict | None) -> tuple[list[ParamSpec], str, str | None]:
    """openapi_schema.components.schemas.Input.properties -> ParamSpecs, plus the
    detected prompt/image input field names."""
    props = (
        ((schema or {}).get("components") or {}).get("schemas", {}).get("Input", {}).get("properties", {})
    )
    prompt_field, image_field = "prompt", None
    params: list[ParamSpec] = []
    for key, spec in props.items():
        low = key.lower()
        if low in _PROMPT_FIELDS:
            prompt_field = key
            continue
        if low in _IMAGE_FIELDS and image_field is None:
            image_field = key
        if low in _SKIP:
            continue
        param = _to_param(key, spec)
        if param is not None:
            params.append(param)
    return params, prompt_field, image_field


def _to_param(key: str, spec: dict) -> ParamSpec | None:
    label = key.replace("_", " ").title()
    default = spec.get("default")
    enum = spec.get("enum") or (spec.get("allOf") or [{}])[0].get("enum")
    if enum:
        return ParamSpec(key, label, "select", default if default is not None else enum[0], options=[str(e) for e in enum])
    typ = spec.get("type")
    if typ in ("integer", "number"):
        return ParamSpec(key, label, "number", default if default is not None else spec.get("minimum", 1),
                         min=spec.get("minimum"), max=spec.get("maximum"))
    if typ == "boolean":
        return ParamSpec(key, label, "boolean", bool(default))
    return None  # freeform strings etc. — skip


def _cost(kind: str) -> int:
    return {"image": 5, "audio": 3, "video": 25}.get(kind, 5)
