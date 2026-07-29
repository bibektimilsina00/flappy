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
DURATION_BANDS = {"short": (15, 30), "medium": (30, 60), "long": (60, 90), "auto": (10, 90)}
RATIO_SIZES = {"9:16": (1080, 1920), "1:1": (1080, 1080), "16:9": (1920, 1080)}

_whisper_model = None  # loaded once per worker process


def _set(session: Session, job: ClipsJob, **fields) -> None:
    if "phase" in fields:  # entering a phase stamps its start (drives UI ETAs)
        from datetime import datetime, timezone

        fields.setdefault("phase_started_at", datetime.now(timezone.utc))
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
        probed = _probe_duration(source)
        if probed and probed > MAX_SOURCE_MINUTES * 60:
            raise ValueError(f"Source is {probed / 60:.0f} min — the limit is {MAX_SOURCE_MINUTES} min.")
        # Poster frame + early duration so the progress page has something to show.
        thumb_key = _thumbnail(job, source, storage, workdir)
        _set(session, job, **({"source_thumb_key": thumb_key} if thumb_key else {}), **({"duration": probed} if probed else {}))

        _set(session, job, phase="transcribe", progress=0.0)

        def on_progress(frac: float, partial: list[dict]) -> None:
            _set(session, job, progress=frac, transcript=partial)

        transcript, duration = _transcribe(source, on_progress)
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
            clips.append({**seg, "id": uuid.uuid4().hex, "key": key, "clean": True})
            _set(session, job, progress=(i + 1) / len(segments), clips=clips)
        charge(settings.clips_credits_per_clip * len(clips), "clips-render")

    _set(session, job, status="completed", progress=1.0)
    schedule_posts(session, job)


def _storage():
    from apps.api.app.storage.factory import get_storage

    return get_storage()


def _probe_duration(path: str) -> float | None:
    """Source length in seconds from ffmpeg's banner — enforces the cap before
    spending transcription time on an over-long video."""
    proc = subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-i", path], capture_output=True)
    m = re.search(rb"Duration: (\d+):(\d+):(\d+\.\d+)", proc.stderr)
    if not m:
        return None
    h, mi, s = int(m.group(1)), int(m.group(2)), float(m.group(3))
    return h * 3600 + mi * 60 + s


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
        # yt-dlp needs ffmpeg to merge video+audio; ours is the bundled
        # imageio-ffmpeg binary, not on PATH.
        "ffmpeg_location": imageio_ffmpeg.get_ffmpeg_exe(),
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
    # Never overwrite a user-provided title from the configure step.
    _set(session, job, source_key=key, **({"source_title": str(title)[:200]} if title and not job.source_title else {}))
    return path


def _thumbnail(job: ClipsJob, source: str, storage, workdir: str) -> str | None:
    """One poster frame for the progress page. Best-effort — never fails a job."""
    thumb = os.path.join(workdir, "thumb.jpg")
    proc = subprocess.run(
        [imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-ss", "1", "-i", source, "-frames:v", "1", "-vf", "scale=480:-2", "-q:v", "4", thumb],
        capture_output=True,
        timeout=60,
    )
    if proc.returncode != 0 or not os.path.exists(thumb) or os.path.getsize(thumb) == 0:
        return None
    key = f"{job.workspace_id}/clips/{job.id}/thumb.jpg"
    with open(thumb, "rb") as f:
        storage.put(key, f.read(), "image/jpeg")
    return key


# ── phase 2: transcribe (local faster-whisper, word timestamps) ─────────────
def _transcribe(path: str, on_progress=None) -> tuple[list[dict], float]:
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
    count = DEFAULT_COUNT if count in (None, "auto") else max(1, min(10, int(count)))
    duration_pref = params.get("duration") or "auto"
    band = DURATION_BANDS.get(duration_pref, DURATION_BANDS["auto"])
    focus = (params.get("focus") or "").strip()

    if duration_pref == "auto":
        # Default product promise: ready-to-post TikTok/Reels length, AI-decided.
        length_rule = (
            "Choose each clip's length by topic completeness — the moment it stops "
            "being gripping, cut. Target the short-form sweet spot of 20-45 seconds "
            "(perfect for TikTok/Reels/Shorts); never shorter than 10s or longer "
            "than 90s, and never pad a clip to make it longer. "
        )
    else:
        length_rule = f"Each segment must be {band[0]}-{band[1]} seconds long. "

    # Condense very long transcripts so small-context models still fit: merge
    # adjacent segments into ~60 blocks (timing precision comes from snapping
    # to word boundaries later, not from these lines).
    condensed = transcript
    if len(transcript) > 120:
        block = max(2, len(transcript) // 60)
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
        "You are a short-form video editor. Below is a timestamped transcript "
        f"({duration:.0f}s total). Pick the {count} best self-contained segments to "
        "publish as vertical clips. Prioritize: a strong hook in the first 3 seconds, "
        "a complete idea that needs no outside context, and high engagement "
        "(dense speech, emotion, concrete takeaways). "
        + (f"The user asked to focus on: {focus}. " if focus else "")
        + length_rule
        + "Respond with ONLY a JSON array, no prose, each item: "
        '{"start": <sec>, "end": <sec>, "title": "<catchy 4-8 word title>", '
        '"score": <0-100 virality estimate>, "reason": "<one line why>"}'
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
                model.id, attempt, raw[:300],
            )
        except Exception as exc:  # noqa: BLE001 — fall back rather than fail the job
            log.warning("clips selection (%s, attempt %d) failed: %s", getattr(model, "id", "?"), attempt, exc)

    if not segments:
        log.warning("clips selection: using deterministic fallback (scores will be 50)")
        segments = fallback_selection(transcript, duration, band, count)
    return segments[:count]


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
    """Cut [start,end] from source and crop to the target aspect — a CLEAN
    master (no burned captions). Captions live as a layer: overlaid in the web
    player, burned on demand at download (burn_clip_captions), and handed to
    the editor as separate text clips."""
    params = job.params or {}
    w, h = RATIO_SIZES.get(params.get("ratio") or "9:16", RATIO_SIZES["9:16"])
    out = os.path.join(workdir, "render.mp4")
    exe = imageio_ffmpeg.get_ffmpeg_exe()

    # Cover-scale then crop. With framing on (default), the crop window centers
    # on the detected face instead of the frame middle.
    x_expr = "(in_w-out_w)/2"
    if params.get("framing", True):
        from apps.api.app.features.clips.framing import face_center_fraction

        center = face_center_fraction(source, seg["start"], seg["end"])
        if center is not None:
            x_expr = f"min(max(in_w*{center:.4f}-out_w/2\\,0)\\,in_w-out_w)"
    vf = f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h}:x='{x_expr}':y='(in_h-out_h)/2',fps=30"

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


def burn_clip_captions(job: ClipsJob, clip: dict, style: str, storage) -> str | None:
    """Burn captions onto a clip's clean master and cache the result on the
    clip ({burned: {style: key}}). Returns the burned key, or None when the
    clip has no speech. Caller persists the job row."""
    from apps.api.app.features.clips.captions import FONTS_DIR, build_ass

    burned = clip.get("burned") or {}
    if style in burned:
        return burned[style]

    w, h = RATIO_SIZES.get((job.params or {}).get("ratio") or "9:16", RATIO_SIZES["9:16"])
    # "custom" resolves to the job's saved template definition.
    style_def = ((job.params or {}).get("caption_custom") or "clean") if style == "custom" else style
    ass = build_ass(
        job.transcript or [], clip["start"], clip["end"], style_def, w, h,
        clip.get("caption_edits"), headline_text=clip.get("title"),
    )
    if not ass:
        return None

    exe = imageio_ffmpeg.get_ffmpeg_exe()
    with tempfile.TemporaryDirectory() as d:
        master = os.path.join(d, "master.mp4")
        with open(master, "wb") as f:
            f.write(storage.get(clip["key"]))
        ass_path = os.path.join(d, "c.ass")
        with open(ass_path, "w", encoding="utf-8") as f:
            f.write(ass)
        out = os.path.join(d, "out.mp4")
        cmd = [
            exe, "-y", "-i", master, "-vf", f"ass={ass_path}:fontsdir={FONTS_DIR}",
            "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p",
            "-c:a", "copy", "-movflags", "+faststart", out,
        ]
        proc = subprocess.run(cmd, capture_output=True, timeout=300)
        if proc.returncode != 0 or not os.path.exists(out) or os.path.getsize(out) == 0:
            raise RuntimeError(f"Caption burn failed: {proc.stderr.decode(errors='ignore')[-300:]}")
        key = f"{job.workspace_id}/clips/{job.id}/clip-{clip['id']}-{style}.mp4"
        with open(out, "rb") as f:
            storage.put(key, f.read(), "video/mp4")
    clip["burned"] = {**burned, style: key}
    return key


def schedule_posts(session: Session, job: ClipsJob) -> None:
    """Create the posting queue for a finished job (params.schedule.enabled).
    Best-effort — a scheduling error never fails the job."""
    cfg = (job.params or {}).get("schedule") or {}
    if not cfg.get("enabled"):
        return
    from apps.api.app.features.clips.models import ScheduledPost
    from apps.api.app.features.clips.schedule import compute_schedule

    try:
        for clip, when in compute_schedule(job.clips or [], cfg):
            session.add(
                ScheduledPost(
                    workspace_id=job.workspace_id,
                    job_id=job.id,
                    clip_id=clip["id"],
                    title=clip.get("title"),
                    post_at=when.replace(tzinfo=None),  # stored naive-UTC like every timestamp here
                )
            )
        session.commit()
    except Exception:  # noqa: BLE001
        log.exception("auto-schedule failed for job %s", job.id)
        session.rollback()
