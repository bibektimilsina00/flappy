"""The whole model catalog, built live from OpenRouter — text, image, video, audio.

OpenRouter is the only inference host: every modality is discovered from its
model APIs and turned into ModelSpecs (all `adapter="openrouter"`). Maker (icon)
comes from the id prefix; the inference host is never surfaced. Each list is
fetched once and cached per process; any failure yields [] so the app still boots.

Endpoints used:
  - text/image/audio discovery:  GET /models?output_modalities=<mod>
  - video discovery (+ schema):  GET /videos/models   (self-describing params)
"""

import httpx

from apps.api.app.core.config import settings
from apps.api.app.integrations.base.model_spec import ModelSpec, ParamSpec

BASE = "https://openrouter.ai/api/v1"
MODELS_URL = f"{BASE}/models"
VIDEO_MODELS_URL = f"{BASE}/videos/models"

# id-org -> icon provider slug (the model's maker). Unmapped orgs fall through to
# the org name (UI renders a lettered fallback).
_PROVIDER = {
    "meta-llama": "meta",
    "mistralai": "mistral",
    "moonshotai": "moonshot",
    "z-ai": "zhipu",
    "x-ai": "grok",
    "black-forest-labs": "flux",
    "bytedance-seed": "bytedance",
    "bytedance": "bytedance",
    "kwaivgi": "kling",
    "google": "google",
    "openai": "openai",
    "alibaba": "alibaba",
    "minimax": "minimax",
    "canopylabs": "canopy",
    "hexgrad": "kokoro",
}


def _provider(model_id: str) -> str:
    org = model_id.split("/", 1)[0].lower() if "/" in model_id else model_id.lower()
    return _PROVIDER.get(org, org)


def _name(model: dict) -> str:
    # Names look like "OpenAI: GPT-4.1" — drop the vendor prefix.
    name = model.get("name") or model["id"]
    return name.split(":", 1)[1].strip() if ":" in name else name


def _bucket(usd: float) -> int:
    """Rough real per-generation USD -> credit cost. Keeps free/premium ordering
    meaningful without hand-pricing every model."""
    if usd <= 0.01:
        return 1
    if usd <= 0.03:
        return 2
    if usd <= 0.08:
        return 3
    if usd <= 0.25:
        return 4
    return 5


def _f(v) -> float:
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def _get(url: str, **params) -> list[dict]:
    """GET a model list; returns the `data` array or [] on any failure."""
    try:
        with httpx.Client(timeout=15) as client:
            res = client.get(
                url,
                params=params or None,
                headers={"Authorization": f"Bearer {settings.open_router_api_key}"},
            )
            res.raise_for_status()
            return res.json().get("data", [])
    except Exception:
        return []


def _skip(mid: str) -> bool:
    """Router pseudo-models and variant aliases (:free/:beta/:thinking)."""
    return mid.startswith("openrouter/") or ":" in mid


# ── Text ──────────────────────────────────────────────────────────────────────

def _text_cost(pricing: dict) -> int:
    per_m = _f(pricing.get("completion")) * 1_000_000
    if per_m <= 1:
        return 1
    if per_m <= 5:
        return 2
    if per_m <= 15:
        return 3
    return 4


def _text_usd(pricing: dict) -> float:
    """Rough real cost of one text call (~500 in + ~800 out tokens)."""
    return round(_f(pricing.get("prompt")) * 500 + _f(pricing.get("completion")) * 800, 6)


_text_cache: list[ModelSpec] | None = None


def openrouter_text_models() -> list[ModelSpec]:
    global _text_cache
    if _text_cache is not None:
        return _text_cache
    if not settings.open_router_api_key:
        _text_cache = []
        return _text_cache
    models: list[ModelSpec] = []
    for m in _get(MODELS_URL):
        mid = m.get("id", "")
        if _skip(mid):
            continue
        out = (m.get("architecture") or {}).get("output_modalities") or []
        # Chat only: skip image/audio generators that also happen to emit text.
        if "text" not in out or "image" in out or "audio" in out:
            continue
        pricing = m.get("pricing") or {}
        models.append(
            ModelSpec(
                id=mid, name=_name(m), kind="text", adapter="openrouter",
                provider=_provider(mid), cost=_text_cost(pricing), usd=_text_usd(pricing),
                config={"model": mid},
            )
        )
    _text_cache = models
    return models


# ── Image ─────────────────────────────────────────────────────────────────────

def _image_usd(pricing: dict) -> float:
    per_img = _f(pricing.get("image"))
    if per_img > 0:
        return round(per_img, 6)
    per_tok = _f(pricing.get("completion")) or _f(pricing.get("prompt"))
    if per_tok > 0:
        return round(per_tok * 1300, 6)  # ~1 image ≈ 1.3k output tokens (rough)
    return 0.03  # unknown (flux/recraft/krea price per-request) — mid bucket


_image_cache: list[ModelSpec] | None = None


def openrouter_image_models() -> list[ModelSpec]:
    global _image_cache
    if _image_cache is not None:
        return _image_cache
    if not settings.open_router_api_key:
        _image_cache = []
        return _image_cache
    models: list[ModelSpec] = []
    for m in _get(MODELS_URL, output_modalities="image"):
        mid = m.get("id", "")
        if _skip(mid):
            continue
        usd = _image_usd(m.get("pricing") or {})
        models.append(
            ModelSpec(
                id=mid, name=_name(m), kind="image", adapter="openrouter",
                provider=_provider(mid), cost=_bucket(usd), usd=usd,
                description=_desc(m.get("description")),
                config={"model": mid},
            )
        )
    _image_cache = models
    return models


# ── Video ─────────────────────────────────────────────────────────────────────

def _video_usd(skus: dict) -> float:
    """Cents per output second (prefer 720p) × a nominal 5s clip -> USD."""
    key = next(
        (k for k in ("cents_per_video_output_second_720p",
                     "cents_per_video_output_second_1080p",
                     "cents_per_video_output_second_480p") if k in skus),
        next((k for k in skus if "per_video_output_second" in k), None),
    )
    if not key:
        return 0.25
    return round(_f(skus[key]) / 100 * 5, 4)


def _video_params(m: dict) -> list[ParamSpec]:
    """Self-describing settings from the video model's own capability list."""
    params: list[ParamSpec] = []
    res = m.get("supported_resolutions") or []
    if res:
        params.append(ParamSpec("resolution", "Resolution", "select", res[0], options=[str(r) for r in res]))
    ratios = m.get("supported_aspect_ratios") or []
    if ratios:
        params.append(ParamSpec("aspect_ratio", "Aspect ratio", "select", str(ratios[0]), options=[str(r) for r in ratios]))
    durs = m.get("supported_durations") or []
    if durs:
        default = 5 if 5 in durs else durs[0]
        params.append(ParamSpec("duration", "Duration (s)", "select", str(default), options=[str(d) for d in durs]))
    return params


_video_cache: list[ModelSpec] | None = None


def openrouter_video_models() -> list[ModelSpec]:
    global _video_cache
    if _video_cache is not None:
        return _video_cache
    if not settings.open_router_api_key:
        _video_cache = []
        return _video_cache
    models: list[ModelSpec] = []
    for m in _get(VIDEO_MODELS_URL):
        mid = m.get("id", "")
        if _skip(mid):
            continue
        usd = _video_usd(m.get("pricing_skus") or {})
        frames = m.get("supported_frame_images") or []
        models.append(
            ModelSpec(
                id=mid, name=_name(m), kind="video", adapter="openrouter",
                provider=_provider(mid), cost=_bucket(usd), usd=usd,
                description=_desc(m.get("description")), params=_video_params(m),
                config={"model": mid, **({"frames": frames} if frames else {})},
            )
        )
    _video_cache = models
    return models


# ── Audio (TTS speech + music) ──────────────────────────────────────────────────

_audio_cache: list[ModelSpec] | None = None


def openrouter_audio_models() -> list[ModelSpec]:
    """Speech (TTS voiceover, /audio/speech) and music/audio-out (chat with audio
    modality). `audio_mode` in config tells the adapter which path to take."""
    global _audio_cache
    if _audio_cache is not None:
        return _audio_cache
    if not settings.open_router_api_key:
        _audio_cache = []
        return _audio_cache
    models: list[ModelSpec] = []
    for mode, modality in (("speech", "speech"), ("music", "audio")):
        for m in _get(MODELS_URL, output_modalities=modality):
            mid = m.get("id", "")
            if _skip(mid):
                continue
            pricing = m.get("pricing") or {}
            # TTS is billed on input (`prompt`, per char/token); music on `completion`.
            if mode == "speech":
                usd = round(_f(pricing.get("prompt")) * 500, 6) or 0.005
            else:
                usd = round(_f(pricing.get("completion")) * 800, 6) or 0.06
            # /audio/speech requires a `voice`; voices are self-describing per model.
            params: list[ParamSpec] = []
            voices = m.get("supported_voices")
            if mode == "speech" and isinstance(voices, list) and voices:
                params.append(ParamSpec("voice", "Voice", "select", str(voices[0]), options=[str(v) for v in voices]))
            models.append(
                ModelSpec(
                    id=mid, name=_name(m), kind="audio", adapter="openrouter",
                    provider=_provider(mid), cost=_bucket(usd), usd=usd,
                    description=_desc(m.get("description")), params=params,
                    config={"model": mid, "audio_mode": mode},
                )
            )
    _audio_cache = models
    return models


def _desc(text: str | None) -> str | None:
    if not text:
        return None
    first = text.strip().split(". ")[0].strip().rstrip(".")
    return (first[:110] + "…") if len(first) > 110 else first
