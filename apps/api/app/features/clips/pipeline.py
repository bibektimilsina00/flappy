"""Clips pipeline: ingest -> transcribe -> select -> render (CLIPS-PLAN.md M1).

Runs inside the Celery worker. Each phase persists status/progress on the job row
so the UI can poll honestly. The only paid AI call is the selection step, made
through the existing OpenRouter adapter; transcription is local faster-whisper.
"""

from __future__ import annotations

import json
import logging
import os
import re
import subprocess
import tempfile
import uuid

import imageio_ffmpeg
from sqlmodel import Session

from apps.api.app.core.config import settings
from apps.api.app.features.clips import repository
from apps.api.app.features.clips.models import ClipsJob
from apps.api.app.integrations.base.adapter import GenerationRequest
from apps.api.app.integrations.registry import get_adapter, resolve_model

log = logging.getLogger(__name__)

MAX_SOURCE_MINUTES = 30
DEFAULT_COUNT = 5
DURATION_BANDS = {"short": (15, 30), "medium": (30, 60), "long": (60, 90), "auto": (15, 90)}
RATIO_SIZES = {"9:16": (1080, 1920), "1:1": (1080, 1080), "16:9": (1920, 1080)}

_whisper_model = None  # loaded once per worker process


def _set(session: Session, job: ClipsJob, **fields) -> None:
    for k, v in fields.items():
        setattr(job, k, v)
    repository.save(session, job)


def run_pipeline(session: Session, job: ClipsJob, charge) -> None:
    """Execute all phases; raises on failure (caller records the error).
    `charge(credits, label)` books usage through the billing ledger."""
    storage = _storage()
    with tempfile.TemporaryDirectory() as workdir:
        _set(session, job, status="running", phase="ingest", progress=0.0)
        source = _ingest(session, job, storage, workdir)

        _set(session, job, phase="transcribe", progress=0.0)
        transcript, duration = _transcribe(source)
        if duration > MAX_SOURCE_MINUTES * 60:
            raise ValueError(f"Source is {duration / 60:.0f} min — the limit is {MAX_SOURCE_MINUTES} min.")
        if not transcript:
            raise ValueError("No speech found in the source video.")
        _set(session, job, duration=duration, transcript=transcript, phase="select", progress=0.0)

        segments = _select(job, transcript, duration)
        charge(settings.clips_credits_select, "clips-select")
        _set(session, job, phase="render", progress=0.0)

        clips = []
        for i, seg in enumerate(segments):
            key = _render_clip(job, source, seg, i, workdir, storage)
            clips.append({**seg, "id": uuid.uuid4().hex, "key": key})
            _set(session, job, progress=(i + 1) / len(segments), clips=clips)
        charge(settings.clips_credits_per_clip * len(clips), "clips-render")

    _set(session, job, status="completed", progress=1.0)


def _storage():
    from apps.api.app.storage.factory import get_storage

    return get_storage()


# ── phase 1: ingest ──────────────────────────────────────────────────────────
def _ingest(session: Session, job: ClipsJob, storage, workdir: str) -> str:
    if job.source_key:
        path = os.path.join(workdir, "source" + (os.path.splitext(job.source_key)[1] or ".mp4"))
        with open(path, "wb") as f:
            f.write(storage.get(job.source_key))
        return path

    import yt_dlp

    path = os.path.join(workdir, "source.mp4")
    opts = {
        "outtmpl": path,
        "format": "bv*[height<=1080]+ba/b[height<=1080]/b",
        "merge_output_format": "mp4",
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
    }
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(job.source_url, download=True)
    except Exception as exc:
        raise ValueError(f"Could not fetch that link: {exc}") from exc
    title = (info or {}).get("title")
    if not os.path.exists(path):
        raise ValueError("Download produced no video file.")
    # Persist the source so per-clip re-renders (trim/caption edits) never
    # need to re-download.
    key = f"{job.workspace_id}/clips/{job.id}/source.mp4"
    with open(path, "rb") as f:
        storage.put(key, f.read(), "video/mp4")
    _set(session, job, source_key=key, **({"source_title": str(title)[:200]} if title else {}))
    return path


# ── phase 2: transcribe (local faster-whisper, word timestamps) ─────────────
def _transcribe(path: str) -> tuple[list[dict], float]:
    global _whisper_model
    if _whisper_model is None:
        from faster_whisper import WhisperModel

        _whisper_model = WhisperModel(settings.clips_whisper_model, compute_type="int8")
    segments, info = _whisper_model.transcribe(path, word_timestamps=True, vad_filter=True)
    out = [
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
        for seg in segments
        if seg.text.strip()
    ]
    return out, float(info.duration or 0)


# ── phase 3: select (one text-model call via the OpenRouter adapter) ────────
def _select(job: ClipsJob, transcript: list[dict], duration: float) -> list[dict]:
    params = job.params or {}
    count = params.get("count", "auto")
    count = DEFAULT_COUNT if count in (None, "auto") else max(1, min(10, int(count)))
    band = DURATION_BANDS.get(params.get("duration") or "auto", DURATION_BANDS["auto"])
    focus = (params.get("focus") or "").strip()

    lines = "\n".join(f"[{s['start']:.0f}-{s['end']:.0f}] {s['text']}" for s in transcript)
    prompt = (
        "You are a short-form video editor. Below is a timestamped transcript "
        f"({duration:.0f}s total). Pick the {count} best self-contained segments to "
        "publish as vertical clips. Prioritize: a strong hook in the first 3 seconds, "
        "a complete idea that needs no outside context, and high engagement "
        "(dense speech, emotion, concrete takeaways). "
        + (f"The user asked to focus on: {focus}. " if focus else "")
        + f"Each segment must be {band[0]}-{band[1]} seconds long. "
        "Respond with ONLY a JSON array, no prose, each item: "
        '{"start": <sec>, "end": <sec>, "title": "<catchy 4-8 word title>", '
        '"score": <0-100 virality estimate>, "reason": "<one line why>"}'
    )

    raw = None
    try:
        model = resolve_model("text", settings.clips_select_model or None)
        if model is not None:
            adapter = get_adapter(model.adapter)
            result = adapter.generate(model, GenerationRequest(kind="text", prompt=prompt), None)
            raw = result.text
    except Exception as exc:  # noqa: BLE001 — fall back rather than fail the job
        log.warning("clips selection model failed, using fallback: %s", exc)

    segments = parse_selection(raw, duration, band) if raw else []
    if not segments:
        segments = fallback_selection(transcript, duration, band, count)
    return segments[:count]


def parse_selection(raw: str, duration: float, band: tuple[int, int]) -> list[dict]:
    """Parse + sanitize the model's JSON. Bad items are dropped, not fatal."""
    match = re.search(r"\[.*\]", raw, re.DOTALL)
    if not match:
        return []
    try:
        items = json.loads(match.group(0))
    except json.JSONDecodeError:
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


def fallback_selection(transcript: list[dict], duration: float, band: tuple[int, int], count: int) -> list[dict]:
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
def _render_clip(job: ClipsJob, source: str, seg: dict, index: int, workdir: str, storage) -> str:
    return render_clip_file(
        job, source, seg, workdir, storage,
        key=f"{job.workspace_id}/clips/{job.id}/clip-{index}.mp4",
    )


def render_clip_file(job: ClipsJob, source: str, seg: dict, workdir: str, storage, key: str) -> str:
    """Cut [start,end] from source, crop to the target aspect, burn captions
    (unless params.captions is false), store at `key`. Shared by the pipeline
    and single-clip re-renders."""
    from apps.api.app.features.clips.captions import FONTS_DIR, build_ass

    params = job.params or {}
    w, h = RATIO_SIZES.get(params.get("ratio") or "9:16", RATIO_SIZES["9:16"])
    out = os.path.join(workdir, "render.mp4")
    exe = imageio_ffmpeg.get_ffmpeg_exe()
    # ponytail: center cover-crop; face-aware framing is M3 (CLIPS-PLAN.md)
    vf = f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},fps=30"

    if params.get("captions", True):
        ass = build_ass(
            job.transcript or [], seg["start"], seg["end"],
            style=params.get("caption_style") or "clean",
            width=w, height=h, edits=seg.get("caption_edits"),
        )
        if ass:
            ass_path = os.path.join(workdir, "captions.ass")
            with open(ass_path, "w", encoding="utf-8") as f:
                f.write(ass)
            vf += f",ass={ass_path}:fontsdir={FONTS_DIR}"

    cmd = [
        exe, "-y", "-ss", f"{seg['start']:.2f}", "-to", f"{seg['end']:.2f}", "-i", source,
        "-vf", vf, "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-movflags", "+faststart", out,
    ]
    proc = subprocess.run(cmd, capture_output=True, timeout=600)
    if proc.returncode != 0 or not os.path.exists(out) or os.path.getsize(out) == 0:
        raise RuntimeError(f"Clip render failed: {proc.stderr.decode(errors='ignore')[-300:]}")
    with open(out, "rb") as f:
        storage.put(key, f.read(), "video/mp4")
    return key
