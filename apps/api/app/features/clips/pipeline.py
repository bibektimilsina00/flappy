"""Clips pipeline: ingest -> transcribe -> select -> render (CLIPS-PLAN.md M1).

Runs inside the Celery worker. Each phase persists status/progress on the job row
so the UI can poll honestly. The only paid AI call is the selection step, made
through the existing OpenRouter adapter; transcription is local faster-whisper.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import subprocess
import tempfile
import uuid
from datetime import UTC

import imageio_ffmpeg
from sqlmodel import Session

from apps.api.app.core.config import settings
from apps.api.app.features.clips import repository
from apps.api.app.features.clips.models import ClipsJob
from apps.api.app.integrations.base.adapter import GenerationRequest
from apps.api.app.integrations.registry import get_adapter, resolve_model

log = logging.getLogger(__name__)

MAX_SOURCE_MINUTES = 120
DEFAULT_COUNT = 5
DURATION_BANDS = {
    # legacy single-select keys
    "short": (15, 30),
    "medium": (30, 60),
    "long": (60, 90),
    "auto": (10, 180),
    # multi-select bands (reference-style length filter)
    "lt30": (10, 30),
    "30-60": (30, 60),
    "60-90": (60, 90),
    "90-180": (90, 180),
    "gt180": (180, 600),
}
RATIO_SIZES = {"9:16": (1080, 1920), "1:1": (1080, 1080), "16:9": (1920, 1080)}


# ── credit costing (single source of truth; 1 credit ≈ $0.01) ────────────────
def auto_count_for(duration: float | None) -> int:
    """Auto clip-count guidance: ~1 per 4 min, between 3 and 10."""
    return max(3, min(10, int(duration // 240))) if duration else DEFAULT_COUNT


def ingest_credits(duration: float | None) -> float:
    """Ingest + transcribe fee: per 2 min of source, minimum 5."""
    import math

    per_2min = settings.clips_credits_per_2min
    return max(5.0, math.ceil((duration or 0) / 120) * per_2min) if duration else 5.0


def estimate_credits(duration: float | None, count) -> float:
    """What a job will roughly charge: ingest + select + per-clip."""
    n = auto_count_for(duration) if count in (None, "auto") else max(1, min(10, int(count)))
    return (
        ingest_credits(duration)
        + settings.clips_credits_select
        + settings.clips_credits_per_clip * n
    )


def watermark_filter() -> str:
    """Platform watermark for free-plan renders (Pro exports stay clean)."""
    from apps.api.app.features.clips.captions import FONTS_DIR

    font = os.path.join(FONTS_DIR, "Poppins.ttf")
    return (
        f",drawtext=fontfile={font}:text='riocut.com':fontcolor=white:alpha=0.55"
        ":fontsize=h/34:x=w*0.035:y=h*0.03:shadowcolor=black@0.6:shadowx=2:shadowy=2"
    )


def workspace_plan(session: Session, workspace_id) -> str:
    from apps.api.app.features.workspaces import repository as workspaces_repo

    ws = workspaces_repo.get(session, workspace_id)
    return ws.plan if ws else "free"


def is_free_plan(session: Session, workspace_id) -> bool:
    return workspace_plan(session, workspace_id) == "free"


_whisper_model = None  # loaded once per worker process


def _set(session: Session, job: ClipsJob, **fields) -> None:
    if "phase" in fields:  # entering a phase stamps its start (drives UI ETAs)
        from datetime import datetime

        fields.setdefault("phase_started_at", datetime.now(UTC))
    for k, v in fields.items():
        setattr(job, k, v)
    repository.save(session, job)


def run_pipeline(session: Session, job: ClipsJob, charge) -> None:
    """Execute all phases; raises on failure (caller records the error).
    `charge(credits, label)` books usage through the billing ledger."""
    storage = _storage()
    # Lower tiers get shorter sources (transcription CPU is the scarce resource).
    from apps.api.app.features.billing.plans import source_limit_min

    limit_min = source_limit_min(workspace_plan(session, job.workspace_id))
    with tempfile.TemporaryDirectory() as workdir:
        _set(session, job, status="running", phase="ingest", progress=0.0)
        source = _ingest(session, job, storage, workdir)
        probed = _probe_duration(source)
        if probed and probed > limit_min * 60:
            raise ValueError(f"Source is {probed / 60:.0f} min — the limit is {limit_min} min.")
        # Poster frame + early duration so the progress page has something to show.
        thumb_key = _thumbnail(job, source, storage, workdir)
        _set(
            session,
            job,
            **({"source_thumb_key": thumb_key} if thumb_key else {}),
            **({"duration": probed} if probed else {}),
        )

        _set(session, job, phase="transcribe", progress=0.0)

        def on_progress(frac: float, partial: list[dict]) -> None:
            _set(session, job, progress=frac, transcript=partial)

        transcript, duration = _transcribe(source, on_progress)
        if duration > limit_min * 60:
            raise ValueError(f"Source is {duration / 60:.0f} min — the limit is {limit_min} min.")
        if not transcript:
            raise ValueError("No speech found in the source video.")
        charge(ingest_credits(duration), "clips-ingest")
        _set(session, job, duration=duration, transcript=transcript, phase="select", progress=0.0)

        segments = _select(job, transcript, duration)
        charge(settings.clips_credits_select, "clips-select")
        # Optional caption decoration (emojis / keyword highlights / censor) —
        # applied to the transcript words so overlay, burn, and SRT all agree.
        _decorate(job, transcript, segments)
        _set(session, job, transcript=transcript, phase="render", progress=0.0)

        watermark = is_free_plan(session, job.workspace_id)
        # Fit layout letterboxes the source — captions/title get positioned in
        # the bars, so remember the band on every clip.
        params = job.params or {}
        band = fit_band(params, _probe_dims(source)) if _layout(params) == "fit" else None
        clips = []
        for i, seg in enumerate(segments):
            key = _render_clip(job, source, seg, i, workdir, storage, watermark)
            clips.append(
                {
                    **seg,
                    "id": uuid.uuid4().hex,
                    "key": key,
                    "clean": True,
                    **({"band": band} if band else {}),
                }
            )
            _set(session, job, progress=(i + 1) / len(segments), clips=clips)
        charge(settings.clips_credits_per_clip * len(clips), "clips-render")

    _set(session, job, status="completed", progress=1.0)
    schedule_posts(session, job)
    try:
        from apps.api.app.features.clips.project_link import populate_project

        populate_project(session, job)
    except Exception:
        log.exception("populate_project failed for job %s", job.id)


def _storage():
    from apps.api.app.storage.factory import get_storage

    return get_storage()


def _probe_dims(path: str) -> tuple[int, int] | None:
    """Source WxH from ffmpeg's banner — drives fit-layout caption bands."""
    proc = subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-i", path], capture_output=True)
    m = re.search(rb"Stream .*Video.* (\d{2,5})x(\d{2,5})", proc.stderr)
    return (int(m.group(1)), int(m.group(2))) if m else None


def fit_band(params: dict, src_dims: tuple[int, int] | None) -> float | None:
    """Top-bar height as a fraction of output height when the source is
    letterboxed (fit layout); None when the video fills the frame."""
    if src_dims is None:
        return None
    w, h = RATIO_SIZES.get(params.get("ratio") or "9:16", RATIO_SIZES["9:16"])
    sw, sh = src_dims
    if not sw or not sh:
        return None
    video_h = w * sh / sw  # width-fit height
    if video_h >= h - 8:
        return None
    return round((h - video_h) / 2 / h, 4)


def _layout(params: dict) -> str:
    custom = (params.get("caption_custom") or {}) if params.get("caption_style") == "custom" else {}
    return params.get("layout") or custom.get("layout") or "auto"


def _probe_duration(path: str) -> float | None:
    """Source length in seconds from ffmpeg's banner — enforces the cap before
    spending transcription time on an over-long video."""
    proc = subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-i", path], capture_output=True)
    m = re.search(rb"Duration: (\d+):(\d+):(\d+\.\d+)", proc.stderr)
    if not m:
        return None
    h, mi, s = int(m.group(1)), int(m.group(2)), float(m.group(3))
    return h * 3600 + mi * 60 + s


def ydl_base_opts() -> dict:
    """Shared yt-dlp options. Cookies + a PO-token provider get past YouTube's
    bot wall on datacenter IPs; with neither configured, we go without."""
    opts = {"noplaylist": True, "quiet": True, "no_warnings": True}
    if settings.clips_cookies_file and os.path.exists(settings.clips_cookies_file):
        opts["cookiefile"] = settings.clips_cookies_file
    if settings.clips_pot_provider_url:
        opts["extractor_args"] = {
            "youtubepot-bgutilhttp": {"base_url": [settings.clips_pot_provider_url]}
        }
    if settings.clips_proxy:
        opts["proxy"] = settings.clips_proxy
    return opts


def ydl_extract(
    url: str, download: bool, extra_opts: dict | None = None, allow_proxy: bool = True
) -> dict:
    """Try direct first (free bandwidth); retry through the residential proxy
    only when the direct attempt fails — paid GB is spent purely on rescues.
    allow_proxy=False (free plan) never touches the proxy."""
    import yt_dlp

    opts = {**ydl_base_opts(), **(extra_opts or {})}
    proxy = opts.pop("proxy", None)
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            return ydl.extract_info(url, download=download)
    except Exception:
        if not proxy or not allow_proxy:
            raise
        log.info("yt-dlp direct failed for %s; retrying via proxy", url)
        with yt_dlp.YoutubeDL({**opts, "proxy": proxy}) as ydl:
            return ydl.extract_info(url, download=download)


def friendly_link_error(exc: Exception) -> str:
    """Turn yt-dlp's wall of text into something a user can act on."""
    msg = str(exc)
    if "Sign in to confirm" in msg or "not a bot" in msg:
        return (
            "YouTube is blocking this video from being fetched by our servers. "
            "Please download the video to your device, then upload the file here instead."
        )
    if "Private video" in msg:
        return "This video is private — only public videos can be imported."
    if "age" in msg.lower() and "restrict" in msg.lower():
        return (
            "This video is age-restricted and can't be imported. "
            "Download it and upload the file instead."
        )
    if "Video unavailable" in msg:
        return "This video is unavailable — it may have been removed or region-locked."
    # Generic: strip the "ERROR: [youtube] xyz:" prefix and any trailing docs links.
    msg = re.sub(r"^ERROR:\s*(\[[^\]]+\]\s*)?([\w-]+:\s*)?", "", msg)
    msg = msg.split(" See http")[0].split(" Use --")[0].strip()
    return f"Could not read that link: {msg or 'unknown error'}"


# ── phase 1: ingest ──────────────────────────────────────────────────────────
def _ingest(session: Session, job: ClipsJob, storage, workdir: str) -> str:
    if job.source_key:
        path = os.path.join(workdir, "source" + (os.path.splitext(job.source_key)[1] or ".mp4"))
        with open(path, "wb") as f:
            f.write(storage.get(job.source_key))
        return path

    path = os.path.join(workdir, "source.mp4")
    # Free plan: hard 720p cap and no proxy rescue — paid bandwidth is Pro's.
    free = is_free_plan(session, job.workspace_id)
    requested = 720 if (job.params or {}).get("quality") == "720p" else 1080
    cap = 720 if free else requested
    extra = {
        "outtmpl": path,
        "format": f"bv*[height<={cap}]+ba/b[height<={cap}]/b",
        "merge_output_format": "mp4",
        # yt-dlp needs ffmpeg to merge video+audio; ours is the bundled
        # imageio-ffmpeg binary, not on PATH.
        "ffmpeg_location": imageio_ffmpeg.get_ffmpeg_exe(),
    }
    try:
        info = ydl_extract(job.source_url, download=True, extra_opts=extra, allow_proxy=not free)
    except Exception as exc:
        raise ValueError(friendly_link_error(exc)) from exc
    title = (info or {}).get("title")
    if not os.path.exists(path):
        raise ValueError("Download produced no video file.")
    # Persist the source so per-clip re-renders (trim/caption edits) never
    # need to re-download.
    key = f"{job.workspace_id}/clips/{job.id}/source.mp4"
    with open(path, "rb") as f:
        storage.put(key, f.read(), "video/mp4")
    # Never overwrite a user-provided title from the configure step.
    _set(
        session,
        job,
        source_key=key,
        **({"source_title": str(title)[:200]} if title and not job.source_title else {}),
    )
    return path


def _thumbnail(job: ClipsJob, source: str, storage, workdir: str) -> str | None:
    """One poster frame for the progress page. Best-effort — never fails a job."""
    thumb = os.path.join(workdir, "thumb.jpg")
    proc = subprocess.run(
        [
            imageio_ffmpeg.get_ffmpeg_exe(),
            "-y",
            "-ss",
            "1",
            "-i",
            source,
            "-frames:v",
            "1",
            "-vf",
            "scale=480:-2",
            "-q:v",
            "4",
            thumb,
        ],
        capture_output=True,
        timeout=60,
    )
    if proc.returncode != 0 or not os.path.exists(thumb) or os.path.getsize(thumb) == 0:
        return None
    key = f"{job.workspace_id}/clips/{job.id}/thumb.jpg"
    with open(thumb, "rb") as f:
        storage.put(key, f.read(), "image/jpeg")
    return key


# ── phase 2: transcribe (API whisper via OpenRouter, local fallback) ────────
def _transcribe(path: str, on_progress=None) -> tuple[list[dict], float]:
    """API transcription when CLIPS_TRANSCRIBE_MODEL is set (seconds instead
    of ~20 CPU-min per source hour); local faster-whisper otherwise/on failure."""
    if settings.clips_transcribe_model:
        try:
            return _transcribe_api(path, on_progress)
        except Exception as exc:  # noqa: BLE001 — degrade to local, never fail the job here
            log.warning("API transcription failed (%s); falling back to local whisper", exc)
    return _transcribe_local(path, on_progress)


def _transcribe_api(path: str, on_progress=None) -> tuple[list[dict], float]:
    """OpenRouter /audio/transcriptions in ~10-min chunks (25 MB / 60 s upstream
    limits). Providers return word timestamps; caption lines are grouped here."""
    import httpx

    duration = _probe_duration(path)
    if not duration:
        raise RuntimeError("no duration probed")
    exe = imageio_ffmpeg.get_ffmpeg_exe()
    chunk_s = 600
    words_all: list[dict] = []
    out: list[dict] = []
    with tempfile.TemporaryDirectory() as d:
        for start in range(0, int(duration) + 1, chunk_s):
            mp3 = os.path.join(d, f"chunk-{start}.mp3")
            subprocess.run(
                [
                    exe,
                    "-y",
                    "-ss",
                    str(start),
                    "-t",
                    str(chunk_s),
                    "-i",
                    path,
                    "-vn",
                    "-ac",
                    "1",
                    "-ar",
                    "16000",
                    "-b:a",
                    "32k",
                    mp3,
                ],
                capture_output=True,
                check=True,
            )
            if not os.path.exists(mp3) or os.path.getsize(mp3) < 1024:
                continue
            with open(mp3, "rb") as f:
                r = httpx.post(
                    "https://openrouter.ai/api/v1/audio/transcriptions",
                    headers={"Authorization": f"Bearer {settings.open_router_api_key}"},
                    files={"file": ("audio.mp3", f, "audio/mpeg")},
                    data={
                        "model": settings.clips_transcribe_model,
                        "response_format": "verbose_json",
                        "timestamp_granularities[]": "word",
                    },
                    timeout=180,
                )
            if r.status_code >= 400:
                raise RuntimeError(f"transcription {r.status_code}: {r.text[:200]}")
            for w in r.json().get("words") or []:
                token = str(w.get("word", "")).strip()
                if token:
                    words_all.append(
                        {
                            "w": token,
                            "s": round(w["start"] + start, 2),
                            "e": round(w["end"] + start, 2),
                        }
                    )
            out = _group_words(words_all)
            if on_progress:
                on_progress(min(0.99, (start + chunk_s) / duration), list(out))
    return _group_words(words_all), float(duration)


def _group_words(words: list[dict]) -> list[dict]:
    """Words -> caption-sized segments: break on speech gaps or every ~14 words."""
    segments: list[dict] = []
    cur: list[dict] = []
    for w in words:
        if cur and (w["s"] - cur[-1]["e"] >= 0.8 or len(cur) >= 14):
            segments.append(cur)
            cur = []
        cur.append(w)
    if cur:
        segments.append(cur)
    return [
        {
            "text": " ".join(w["w"] for w in seg),
            "start": seg[0]["s"],
            "end": seg[-1]["e"],
            "words": seg,
        }
        for seg in segments
    ]


def _transcribe_local(path: str, on_progress=None) -> tuple[list[dict], float]:
    """Streams whisper segments; every ~5% of the source, `on_progress(frac,
    partial_transcript)` fires so the UI can show a live bar + transcript."""
    global _whisper_model
    if _whisper_model is None:
        from faster_whisper import WhisperModel

        _whisper_model = WhisperModel(settings.clips_whisper_model, compute_type="int8")
    segments, info = _whisper_model.transcribe(path, word_timestamps=True, vad_filter=True)
    duration = float(info.duration or 0)
    out: list[dict] = []
    last_reported = 0.0
    for seg in segments:
        if not seg.text.strip():
            continue
        out.append(
            {
                "text": seg.text.strip(),
                "start": round(seg.start, 2),
                "end": round(seg.end, 2),
                "words": [
                    {"w": w.word.strip(), "s": round(w.start, 2), "e": round(w.end, 2)}
                    for w in (seg.words or [])
                    if w.word.strip()
                ],
            }
        )
        if on_progress and duration and (seg.end - last_reported) >= duration * 0.05:
            last_reported = seg.end
            on_progress(min(0.99, seg.end / duration), list(out))
    return out, duration


# ── phase 3: select (one text-model call via the OpenRouter adapter) ────────
def _select(job: ClipsJob, transcript: list[dict], duration: float) -> list[dict]:
    params = job.params or {}
    count = params.get("count", "auto")
    auto = count in (None, "auto")
    if auto:
        # Duration-scaled guidance; the model may exceed it up to 10 when the
        # video is dense — the cap below is the law.
        count = auto_count_for(duration)
        count_phrase = (
            f"Pick around {count} segments most likely to stop the scroll — more "
            "(up to 10) if the video is packed with strong moments, fewer if it "
            "is thin. Quality over quota: never pad with weak picks."
        )
    else:
        count = max(1, min(10, int(count)))
        count_phrase = f"Pick the {count} segments most likely to stop the scroll."
    max_clips = 10 if auto else count
    duration_pref = params.get("duration") or "auto"
    if isinstance(duration_pref, list):
        chosen = [DURATION_BANDS[b] for b in duration_pref if b in DURATION_BANDS]
        if chosen:
            # envelope for sanitizing; the prompt lists the exact ranges
            band = (min(lo for lo, _ in chosen), max(hi for _, hi in chosen))
            ranges = " or ".join(f"{lo}-{hi}s" for lo, hi in chosen)
            duration_pref = f"ranges:{ranges}"
        else:
            duration_pref = "auto"
            band = DURATION_BANDS["auto"]
    else:
        band = DURATION_BANDS.get(duration_pref, DURATION_BANDS["auto"])
    focus = (params.get("focus") or "").strip()

    if isinstance(duration_pref, str) and duration_pref.startswith("ranges:"):
        length_rule = (
            f"Each segment's length must fall in one of these ranges: {duration_pref[7:]}. "
        )
    elif duration_pref == "auto":
        # Default product promise: ready-to-post TikTok/Reels length, AI-decided.
        length_rule = (
            "Choose each clip's length by topic completeness — the moment it stops "
            "being gripping, cut. Punchy moments work best at 20-45 seconds; let a "
            "complete story, explanation, or exchange run 60-120 seconds when it "
            "stays gripping the whole way — never cut a payoff to hit a length. "
            "Hard limits: never shorter than 10s, never longer than 180s, and "
            "never pad a clip to make it longer. "
        )
    else:
        length_rule = f"Each segment must be {band[0]}-{band[1]} seconds long. "

    # Condense very long transcripts so the prompt stays a sane size: merge
    # adjacent segments into ~150 blocks (timing precision comes from snapping
    # to word boundaries later, not from these lines).
    condensed = transcript
    if len(transcript) > 200:
        block = max(2, len(transcript) // 150)
        condensed = [
            {
                "start": chunk[0]["start"],
                "end": chunk[-1]["end"],
                "text": " ".join(s["text"] for s in chunk),
            }
            for chunk in (transcript[i : i + block] for i in range(0, len(transcript), block))
        ]

    lines = "\n".join(f"[{s['start']:.0f}-{s['end']:.0f}] {s['text']}" for s in condensed)
    prompt = (
        "You are an expert short-form video editor who has cut thousands of viral "
        "TikTok/Reels/Shorts clips. Below is a timestamped transcript "
        f"({duration:.0f}s total). {count_phrase}\n\n"
        "What makes a winning clip, in priority order:\n"
        "1. HOOK: the first spoken line grabs with zero context — a bold claim, a "
        "surprising number, a direct question, a confession, the start of a story "
        "or conflict. Start the clip exactly where that line begins; never on "
        "filler, never mid-idea.\n"
        "2. SELF-CONTAINED: a viewer who never saw the full video understands and "
        "feels something. Needs outside setup -> skip it.\n"
        "3. PAYOFF: the clip resolves — a punchline, an answer, a takeaway, an "
        "emotional peak. End right after the payoff lands; never trail off.\n"
        "4. ENERGY: dense speech, real emotion (laughter, anger, awe), specifics "
        "over generalities.\n\n"
        "Never pick: channel intros or outros, greetings, sponsor reads or ads, "
        "like-and-subscribe moments, housekeeping, rambling without a point. "
        "Pick distinct moments — spread across the whole video when quality "
        "allows, never two clips making the same point.\n\n"
        + (f"The user asked to focus on: {focus}. " if focus else "")
        + length_rule
        + "\n\nScore honestly: 90+ exceptional shareable moment, 70-89 strong, "
        "50-69 decent, under 50 filler. Title: 4-8 words, curiosity-driven but "
        "true to the content, in the same language the speaker uses.\n"
        "Timestamps are seconds. Transcript lines may be coarse blocks — estimate "
        "start/end for the exact sentences you mean; boundaries get snapped to "
        "word timings afterwards.\n\n"
        "Respond with ONLY a JSON array, no prose, each item: "
        '{"start": <sec>, "end": <sec>, "title": "<title>", '
        '"score": <0-100>, "reason": "<one line why>"}'
        "\n\nTranscript:\n" + lines
    )

    model = resolve_model("text", settings.clips_select_model or None)
    segments: list[dict] = []
    # Two attempts: free/default models are flaky on strict-JSON tasks.
    for attempt in (1, 2):
        if model is None:
            break
        try:
            adapter = get_adapter(model.adapter)
            result = adapter.generate(model, GenerationRequest(kind="text", prompt=prompt), None)
            raw = result.text or ""
            segments = parse_selection(raw, duration, band)
            if segments:
                break
            log.warning(
                "clips selection (%s, attempt %d): unparseable response, head: %r",
                model.id,
                attempt,
                raw[:300],
            )
        except Exception as exc:  # noqa: BLE001 — fall back rather than fail the job
            log.warning(
                "clips selection (%s, attempt %d) failed: %s",
                getattr(model, "id", "?"),
                attempt,
                exc,
            )

    if not segments:
        log.warning("clips selection: using deterministic fallback (scores will be 50)")
        segments = fallback_selection(transcript, duration, band, count)
    if len(segments) > max_clips:  # keep the strongest, back in timeline order
        segments = sorted(segments, key=lambda s: -s.get("score", 0))[:max_clips]
        segments.sort(key=lambda s: s["start"])
    return segments


def parse_selection(raw: str, duration: float, band: tuple[int, int]) -> list[dict]:
    """Parse + sanitize the model's JSON. Bad items are dropped, not fatal.
    Tolerates prose/fences around the array: decodes from the first '[' and
    ignores anything after the JSON ends."""
    items = None
    decoder = json.JSONDecoder()
    idx = raw.find("[")
    while idx != -1:
        try:
            candidate, _end = decoder.raw_decode(raw, idx)
        except json.JSONDecodeError:
            idx = raw.find("[", idx + 1)
            continue
        if isinstance(candidate, list):
            items = candidate
            break
        idx = raw.find("[", idx + 1)
    if items is None:
        return []
    out: list[dict] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        try:
            start = max(0.0, float(item["start"]))
            end = min(float(duration), float(item["end"]))
        except (KeyError, TypeError, ValueError):
            continue
        if end - start < 5:
            continue
        end = min(end, start + band[1])  # clamp to the requested band's ceiling
        if end - start < band[0] * 0.5:  # hopelessly short for the band -> drop
            continue
        if any(not (end <= c["start"] or start >= c["end"]) for c in out):
            continue  # overlaps an accepted clip
        out.append(
            {
                "start": round(start, 2),
                "end": round(end, 2),
                "duration": round(end - start, 2),
                "title": str(item.get("title") or "Clip")[:80],
                "score": max(0, min(100, int(item.get("score") or 50))),
                "reason": str(item.get("reason") or "")[:200],
            }
        )
    out.sort(key=lambda c: -c["score"])
    return out


def fallback_selection(
    transcript: list[dict], duration: float, band: tuple[int, int], count: int
) -> list[dict]:
    """Deterministic fallback: evenly spaced segments snapped to speech starts.
    The job never dies on a malformed LLM response."""
    target = min(band[1], max(band[0], 45))
    n = max(1, min(count, int(duration // target) or 1))
    step = duration / n
    out = []
    for i in range(n):
        anchor = i * step
        start = next((s["start"] for s in transcript if s["start"] >= anchor), anchor)
        end = min(duration, start + target)
        if end - start < 5:
            continue
        out.append(
            {
                "start": round(start, 2),
                "end": round(end, 2),
                "duration": round(end - start, 2),
                "title": f"Clip {i + 1}",
                "score": 50,
                "reason": "Evenly sampled (automatic fallback)",
            }
        )
    return out


# ── phase 4: render (cut + cover-crop + optional caption burn) ──────────────
def _render_clip(
    job: ClipsJob,
    source: str,
    seg: dict,
    index: int,
    workdir: str,
    storage,
    watermark: bool = False,
) -> str:
    return render_clip_file(
        job,
        source,
        seg,
        workdir,
        storage,
        key=f"{job.workspace_id}/clips/{job.id}/clip-{index}.mp4",
        watermark=watermark,
    )


def render_clip_file(
    job: ClipsJob, source: str, seg: dict, workdir: str, storage, key: str, watermark: bool = False
) -> str:
    """Cut [start,end] from source and crop to the target aspect — a CLEAN
    master (no burned captions). Captions live as a layer: overlaid in the web
    player, burned on demand at download (burn_clip_captions), and handed to
    the editor as separate text clips."""
    params = job.params or {}
    w, h = RATIO_SIZES.get(params.get("ratio") or "9:16", RATIO_SIZES["9:16"])
    out = os.path.join(workdir, "render.mp4")
    exe = imageio_ffmpeg.get_ffmpeg_exe()

    # Layout: fit = letterbox at the source's ratio (TikTok repost style);
    # fill/auto = cover-crop, with auto following the face.
    custom = (params.get("caption_custom") or {}) if params.get("caption_style") == "custom" else {}
    layout = _layout(params)
    if layout == "fit":
        bgc = str(custom.get("bg") or "#000000").lstrip("#")[:6] or "000000"
        vf = f"scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:color=0x{bgc},fps=30"
    else:
        x_expr = "(in_w-out_w)/2"
        if layout in ("auto", "fill") and params.get("framing", True):
            from apps.api.app.features.clips.framing import face_center_fraction

            center = face_center_fraction(source, seg["start"], seg["end"])
            if center is not None:
                x_expr = f"min(max(in_w*{center:.4f}-out_w/2\\,0)\\,in_w-out_w)"
        vf = f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h}:x='{x_expr}':y='(in_h-out_h)/2',fps=30"
    if watermark:
        vf += watermark_filter()

    cmd = [
        exe,
        "-y",
        "-ss",
        f"{seg['start']:.2f}",
        "-to",
        f"{seg['end']:.2f}",
        "-i",
        source,
        "-vf",
        vf,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-movflags",
        "+faststart",
        out,
    ]
    proc = subprocess.run(cmd, capture_output=True, timeout=600)
    if proc.returncode != 0 or not os.path.exists(out) or os.path.getsize(out) == 0:
        raise RuntimeError(f"Clip render failed: {proc.stderr.decode(errors='ignore')[-300:]}")
    with open(out, "rb") as f:
        storage.put(key, f.read(), "video/mp4")
    return key


BURN_VERSION = 2  # bump to invalidate cached caption burns (font/style engine changes)


def burn_clip_captions(job: ClipsJob, clip: dict, style: str, storage) -> str | None:
    """Burn captions onto a clip's clean master and cache the result on the
    clip ({burned: {style: key}}). Returns the burned key, or None when the
    clip has no speech. Caller persists the job row."""
    from apps.api.app.features.clips.captions import FONTS_DIR, build_ass

    headline_cfg = (job.params or {}).get("headline")
    # A user-typed title wins over the clip's AI title, for every clip.
    headline_text = ((headline_cfg or {}).get("text") or "").strip() or clip.get("title")

    burned = clip.get("burned") or {}
    # Title is part of the burn identity — retyping it must re-burn, not
    # replay a cache entry carrying the old text.
    hl_sig = hashlib.md5(
        f"{(headline_cfg or {}).get('enabled')}|{headline_text or ''}".encode()
    ).hexdigest()[:8]
    cache_key = f"{style}#v{BURN_VERSION}#h{hl_sig}"
    if cache_key in burned:
        return burned[cache_key]

    w, h = RATIO_SIZES.get((job.params or {}).get("ratio") or "9:16", RATIO_SIZES["9:16"])
    # "custom" resolves to the job's saved template definition.
    style_def = (
        ((job.params or {}).get("caption_custom") or "clean") if style == "custom" else style
    )
    ass = build_ass(
        job.transcript or [],
        clip["start"],
        clip["end"],
        style_def,
        w,
        h,
        clip.get("caption_edits"),
        headline_text=headline_text,
        headline_cfg=headline_cfg,
        band=clip.get("band"),
    )
    logo_b64 = None
    if isinstance(style_def, dict):
        logo_url = style_def.get("logo") or ""
        if isinstance(logo_url, str) and logo_url.startswith("data:") and "base64," in logo_url:
            logo_b64 = logo_url.split("base64,", 1)[1]
    if not ass and not logo_b64:
        return None

    import base64 as _b64

    exe = imageio_ffmpeg.get_ffmpeg_exe()
    with tempfile.TemporaryDirectory() as d:
        master = os.path.join(d, "master.mp4")
        with open(master, "wb") as f:
            f.write(storage.get(clip["key"]))
        vf_main = "null"
        if ass:
            ass_path = os.path.join(d, "c.ass")
            with open(ass_path, "w", encoding="utf-8") as f:
                f.write(ass)
            vf_main = f"ass={ass_path}:fontsdir={FONTS_DIR}"
        out = os.path.join(d, "out.mp4")
        if logo_b64:
            logo_path = os.path.join(d, "logo.png")
            with open(logo_path, "wb") as f:
                f.write(_b64.b64decode(logo_b64))
            fc = f"[1:v]scale={w // 6}:-1[lg];[0:v]{vf_main}[v0];[v0][lg]overlay=W-w-{int(w * 0.04)}:{int(h * 0.03)}"
            cmd = [
                exe,
                "-y",
                "-i",
                master,
                "-i",
                logo_path,
                "-filter_complex",
                fc,
                "-c:v",
                "libx264",
                "-preset",
                "veryfast",
                "-pix_fmt",
                "yuv420p",
                "-c:a",
                "copy",
                "-movflags",
                "+faststart",
                out,
            ]
        else:
            cmd = [
                exe,
                "-y",
                "-i",
                master,
                "-vf",
                vf_main,
                "-c:v",
                "libx264",
                "-preset",
                "veryfast",
                "-pix_fmt",
                "yuv420p",
                "-c:a",
                "copy",
                "-movflags",
                "+faststart",
                out,
            ]
        proc = subprocess.run(cmd, capture_output=True, timeout=300)
        if proc.returncode != 0 or not os.path.exists(out) or os.path.getsize(out) == 0:
            raise RuntimeError(f"Caption burn failed: {proc.stderr.decode(errors='ignore')[-300:]}")
        key = f"{job.workspace_id}/clips/{job.id}/clip-{clip['id']}-{style}.mp4"
        with open(out, "rb") as f:
            storage.put(key, f.read(), "video/mp4")
    clip["burned"] = {**burned, cache_key: key}
    return key


def schedule_posts(session: Session, job: ClipsJob) -> None:
    """Create the posting queue for a finished job (params.schedule.enabled).
    Best-effort — a scheduling error never fails the job."""
    cfg = (job.params or {}).get("schedule") or {}
    if not cfg.get("enabled"):
        return
    from apps.api.app.features.clips.models import ScheduledPost
    from apps.api.app.features.clips.schedule import (
        compute_schedule,
        workspace_accounts,
    )

    try:
        targets = workspace_accounts(session, job.workspace_id, cfg.get("account_ids") or [])
        for clip, when in compute_schedule(job.clips or [], cfg):
            for account in targets or [None]:
                session.add(
                    ScheduledPost(
                        workspace_id=job.workspace_id,
                        job_id=job.id,
                        clip_id=clip["id"],
                        title=clip.get("title"),
                        post_at=when.replace(
                            tzinfo=None
                        ),  # stored naive-UTC like every timestamp here
                        social_account_id=account.id if account else None,
                        platform=account.platform if account else None,
                    )
                )
        session.commit()
    except Exception:
        log.exception("auto-schedule failed for job %s", job.id)
        session.rollback()


# ── caption decoration: emojis, keyword highlights, censoring ────────────────
CENSOR_WORDS = {
    "fuck",
    "fucking",
    "fucked",
    "shit",
    "bitch",
    "asshole",
    "dick",
    "pussy",
    "cunt",
    "bastard",
    "motherfucker",
    "cock",
    "whore",
    "slut",
}


def _censor_word(word: str) -> str:
    core = re.sub(r"\W", "", word).lower()
    if core in CENSOR_WORDS and len(core) > 2:
        return (
            word.replace(core[1:-1], "*" * (len(core) - 2))
            if core in word.lower()
            else word[0] + "*" * (len(word) - 2) + word[-1]
        )
    return word


def _decorate(job: ClipsJob, transcript: list[dict], clips: list[dict]) -> None:
    """Mutates transcript words in place: censor locally; emojis/keywords via one
    LLM call over the selected clip windows. Failures skip decoration silently."""
    params = job.params or {}
    censor = bool(params.get("censor"))
    emojis = bool(params.get("add_emojis"))
    keywords = bool(params.get("highlight_keywords"))
    if censor:
        for seg in transcript:
            for w in seg.get("words") or []:
                w["w"] = _censor_word(w["w"])
            seg["text"] = " ".join(w["w"] for w in (seg.get("words") or [])) or seg["text"]
    if not (emojis or keywords):
        return

    idxs = [
        i
        for i, s in enumerate(transcript)
        if (s.get("words")) and any(s["end"] > c["start"] and s["start"] < c["end"] for c in clips)
    ]
    if not idxs:
        return
    lines = "\n".join(
        f"{i}: " + " ".join(f"[{j}]{w['w']}" for j, w in enumerate(transcript[i]["words"]))
        for i in idxs
    )
    tasks = []
    if emojis:
        tasks.append(
            'add at most ONE fitting emoji per line, placed after an impactful word ("em": [[word_index, "emoji"]])'
        )
    if keywords:
        tasks.append(
            'pick 1-2 keyword word-indexes per line to highlight ("kw": [word_index, ...])'
        )
    prompt = (
        "You decorate short-video captions. Lines below are numbered, each word "
        "prefixed with its [index]. " + "; ".join(tasks) + ". Only include lines you "
        'change. Respond with ONLY a JSON array of {"i": <line>, '
        + ('"em": [[idx, emoji]], ' if emojis else "")
        + ('"kw": [idx, ...]' if keywords else "")
        + "}.\n\n"
        + lines
    )
    try:
        model = resolve_model("text", settings.clips_select_model or None)
        if model is None:
            return
        raw = (
            get_adapter(model.adapter)
            .generate(model, GenerationRequest(kind="text", prompt=prompt), None)
            .text
            or ""
        )
        decoder = json.JSONDecoder()
        items, idx = None, raw.find("[")
        while idx != -1 and items is None:
            try:
                cand, _ = decoder.raw_decode(raw, idx)
                if isinstance(cand, list):
                    items = cand
            except json.JSONDecodeError:
                pass
            idx = raw.find("[", idx + 1)
        for item in items or []:
            if not isinstance(item, dict):
                continue
            seg = (
                transcript[int(item["i"])]
                if 0 <= int(item.get("i", -1)) < len(transcript)
                else None
            )
            words = (seg or {}).get("words") or []
            if not words:
                continue
            for wi in item.get("kw") or []:
                if isinstance(wi, int) and 0 <= wi < len(words):
                    words[wi]["hl"] = True
            for pair in item.get("em") or []:
                if (
                    isinstance(pair, list)
                    and len(pair) == 2
                    and isinstance(pair[0], int)
                    and 0 <= pair[0] < len(words)
                ):
                    words[pair[0]]["w"] = f"{words[pair[0]]['w']} {str(pair[1])[:4]}"
            seg["text"] = " ".join(w["w"] for w in words)
    except Exception as exc:  # noqa: BLE001 — decoration is optional polish
        log.warning("caption decoration skipped: %s", exc)
