"""Timeline editor project: load (seed on first open) + autosave.

The editor doc is the declarative EditorDoc (VIDEO-EDITOR-PLAN.md §4). On first
open for a workflow we seed a basic timeline from the workflow's assets.
"""

import copy
import os
import subprocess
import tempfile
import urllib.parse
import uuid
from datetime import UTC, datetime

import imageio_ffmpeg
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlmodel import Session, select

from apps.api.app.api.deps import current_workspace_id, get_current_user, get_session
from apps.api.app.core.celery import celery_app
from apps.api.app.features.assets import repository as assets_repo
from apps.api.app.features.assets.models import Asset
from apps.api.app.features.executions import service as executions_service
from apps.api.app.features.social.models import SocialAccount
from apps.api.app.features.users.models import User
from apps.api.app.features.video_editor import repository
from apps.api.app.features.video_editor.models import (
    VideoEditorComment,
    VideoEditorProject,
)
from apps.api.app.features.video_editor.render import build_render_args, build_text_ass
from apps.api.app.features.workflows import repository as workflows_repo
from apps.api.app.features.workflows.models import Workflow
from apps.api.app.features.workspaces.models import Workspace
from apps.api.app.storage.factory import get_storage

router = APIRouter(prefix="/video-editor", tags=["video-editor"])

DEFAULT_W, DEFAULT_H, DEFAULT_FPS = 1080, 1920, 30  # 9:16 default canvas (switchable)


def _id() -> str:
    return uuid.uuid4().hex


def _clip(asset: Asset, kind: str, start: float, dur: float) -> dict:
    return {
        "id": _id(),
        "assetId": str(asset.id),
        "kind": kind,
        "start": start,
        "duration": dur,
        "in": 0.0,
        "out": dur,
        "speed": 1.0,
        "volume": 1.0,
        "transform": {"x": 0, "y": 0, "scale": 1, "rotation": 0, "opacity": 1},
        "keyframes": [],
        "effects": [],
    }


def _track(kind: str, name: str, clips: list[dict]) -> dict:
    return {
        "id": _id(),
        "kind": kind,
        "name": name,
        "locked": False,
        "hidden": False,
        "muted": False,
        "clips": clips,
    }


def _seed_doc(assets: list[Asset]) -> dict:
    """Start minimal: only tracks that have content, plus one trailing empty track.
    The client keeps a trailing empty track as media is added."""
    video_clips: list[dict] = []
    audio_clips: list[dict] = []
    tv = ta = 0.0
    for a in assets:
        if a.kind in ("video", "image", "world"):
            dur = 5.0 if a.kind == "video" else 3.0
            video_clips.append(_clip(a, "image" if a.kind == "image" else "video", tv, dur))
            tv += dur
        elif a.kind == "audio":
            audio_clips.append(_clip(a, "audio", ta, 10.0))
            ta += 10.0
    tracks: list[dict] = []
    if video_clips:
        tracks.append(_track("video", "V1", video_clips))
    if audio_clips:
        tracks.append(_track("audio", "A1", audio_clips))
    tracks.append(_track("video", "Track", []))  # trailing empty add-slot
    return {
        "version": 1,
        "fps": DEFAULT_FPS,
        "width": DEFAULT_W,
        "height": DEFAULT_H,
        "duration": max(tv, ta),
        "background": "#000000",
        "tracks": tracks,
        "markers": [],
    }


def _workflow_media(session: Session, workflow) -> list[dict]:
    """The full media pool for a workflow — generated assets (asset table) plus uploaded
    media (graph node `upload_key`). Each item: {id, kind, key}. `id` is the asset UUID
    for generated, or the storage key for uploaded — the refs a clip's `assetId` uses."""
    pool: list[dict] = []
    seen: set[str] = set()
    for a in assets_repo.all_for_workflow(session, workflow.id):
        if a.key not in seen:
            seen.add(a.key)
            pool.append({"id": str(a.id), "kind": a.kind, "key": a.key})
    for node in (workflow.graph or {}).get("nodes") or []:
        key = (node.get("data") or {}).get("upload_key")
        if not key or key in seen:
            continue
        kind = assets_repo.kind_from_key(key)
        if not kind:
            continue
        seen.add(key)
        pool.append({"id": key, "kind": kind, "key": key})
    return pool


@router.get("/projects/{workflow_id}")
def get_project(
    workflow_id: uuid.UUID,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    workflow = workflows_repo.get(session, workspace_id, workflow_id)
    if workflow is None:
        raise HTTPException(status_code=404, detail="Project not found")

    assets = [
        a for a in assets_repo.latest_by_node_for_workflow(session, workflow_id).values() if a.key
    ]

    project = repository.get_by_workflow(session, workspace_id, workflow_id)
    if project is None:
        project = repository.add(
            session,
            VideoEditorProject(
                workspace_id=workspace_id,
                workflow_id=workflow_id,
                title=workflow.name,
                doc=_seed_doc(assets),
            ),
        )

    storage = get_storage()
    # Media panel = the whole project pool (generated + uploaded from the canvas),
    # so anything created/uploaded in the canvas is available here and vice-versa.
    pool = _workflow_media(session, workflow)
    return {
        "id": str(project.id),
        "title": project.title,
        "doc": project.doc,
        "assets": [
            {"id": item["id"], "kind": item["kind"], "url": storage.url(item["key"])}
            for item in pool
        ],
        "share": {
            "review": project.share_review_token,
            "presentation": project.share_present_token,
        },
    }


@router.post("/projects/{workflow_id}/upload")
async def upload_to_project(
    workflow_id: uuid.UUID,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    """Upload media from the editor. Stored + added to the workflow graph as an upload
    node, so it lives in the shared project pool the canvas reads too."""
    workflow = workflows_repo.get(session, workspace_id, workflow_id)
    if workflow is None:
        raise HTTPException(status_code=404, detail="Project not found")

    ctype = file.content_type or "application/octet-stream"
    kind = ctype.split("/", 1)[0]
    if kind not in ("image", "video", "audio"):
        raise HTTPException(status_code=415, detail=f"Unsupported file type: {ctype}")
    data = await file.read()
    if len(data) > 100 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 100 MB).")

    ext = (
        file.filename.rsplit(".", 1)[-1].lower()
        if file.filename and "." in file.filename
        else "bin"
    )
    key = f"{workspace_id}/uploads/{uuid.uuid4()}.{ext}"
    storage = get_storage()
    storage.put(key, data, ctype)

    name = file.filename or key.rsplit("/", 1)[-1]
    graph = dict(workflow.graph or {})
    nodes = list(graph.get("nodes") or [])
    nodes.append(
        {
            "id": f"node-{uuid.uuid4()}",
            "type": kind,
            "position": {"x": 240 + (len(nodes) % 4) * 300, "y": 140 + len(nodes) * 40},
            "data": {"kind": kind, "upload_key": key, "upload_name": name, "label": name},
        }
    )
    graph["nodes"] = nodes
    workflow.graph = graph
    workflows_repo.save(session, workflow)

    return {"id": key, "kind": kind, "url": storage.url(key), "name": name}


class GenerateRequest(BaseModel):
    kind: str  # "image" | "video" | "audio"
    prompt: str
    model: str | None = None
    params: dict = {}
    source_asset_id: str | None = None  # a pool asset (image → image-to-video, video → extend)


@router.post("/projects/{workflow_id}/generate")
def generate_in_project(
    workflow_id: uuid.UUID,
    body: GenerateRequest,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    """Generate media from the editor. Appends a generation node (and, for image→video /
    extend, an upstream source node + edge) to the shared workflow graph, then runs just
    that node through the normal execution engine. The result Asset joins the workflow via
    its execution, so it lands in the shared media pool the editor and canvas both read.
    """
    if body.kind not in ("image", "video", "audio"):
        raise HTTPException(status_code=422, detail="kind must be 'image', 'video' or 'audio'")
    if not (body.prompt or "").strip():
        raise HTTPException(status_code=422, detail="A prompt is required")

    workflow = workflows_repo.get(session, workspace_id, workflow_id)
    if workflow is None:
        raise HTTPException(status_code=404, detail="Project not found")

    graph = dict(workflow.graph or {})
    nodes = list(graph.get("nodes") or [])
    edges = list(graph.get("edges") or [])
    n = len(nodes)

    gen_id = f"node-{uuid.uuid4()}"

    # Optional source: a pass-through upload node wired into the generator (image→video / extend).
    if body.source_asset_id:
        refmap = {item["id"]: item for item in _workflow_media(session, workflow)}
        src = refmap.get(body.source_asset_id)
        if src is None:
            raise HTTPException(status_code=404, detail="Source media not found")
        source_kind = "video" if src["kind"] == "video" else "image"
        src_id = f"node-{uuid.uuid4()}"
        nodes.append(
            {
                "id": src_id,
                "type": source_kind,
                "position": {"x": 40, "y": 480 + n * 40},
                "data": {"kind": source_kind, "upload_key": src["key"], "label": "source"},
            }
        )
        edges.append(
            {
                "id": f"edge-{uuid.uuid4()}",
                "source": src_id,
                "target": gen_id,
                "sourceHandle": "out",
                "targetHandle": "video" if source_kind == "video" else "image",
            }
        )

    nodes.append(
        {
            "id": gen_id,
            "type": body.kind,
            "position": {"x": 240 + (n % 4) * 320, "y": 480 + n * 40},
            "data": {
                "kind": body.kind,
                "prompt": body.prompt,
                "model": body.model,
                "params": body.params or {},
                "label": (body.prompt or body.kind)[:40],
            },
        }
    )
    graph["nodes"] = nodes
    graph["edges"] = edges
    workflow.graph = graph
    workflows_repo.save(session, workflow)

    # Reuses the execution engine's plan/credit guardrails (may raise 402).
    execution = executions_service.create_execution(
        session, workspace_id, workflow_id, node_id=gen_id
    )
    return {"execution_id": str(execution.id), "node_id": gen_id}


_STOCK_HOSTS = (".pexels.com", ".giphy.com", ".veed.io")
_EXT_BY_MIME = {
    "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
    "video/mp4": "mp4", "video/webm": "webm", "audio/mpeg": "mp3", "audio/wav": "wav",
}


class ImportUrlRequest(BaseModel):
    url: str
    kind: str  # image | video | audio


@router.post("/projects/{workflow_id}/import-url")
def import_url(
    workflow_id: uuid.UUID,
    body: ImportUrlRequest,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    """Import a stock asset from an allow-listed CDN (Pexels/Giphy/VEED) into the
    project pool — the frontend's stock tiles use these hosts."""
    import httpx

    workflow = workflows_repo.get(session, workspace_id, workflow_id)
    if workflow is None:
        raise HTTPException(status_code=404, detail="Project not found")
    if body.kind not in ("image", "video", "audio"):
        raise HTTPException(status_code=422, detail="Unsupported kind")

    host = (urllib.parse.urlparse(body.url).hostname or "").lower()
    if not any(host == h.lstrip(".") or host.endswith(h) for h in _STOCK_HOSTS):
        raise HTTPException(status_code=422, detail="URL host is not allowed")

    try:
        with httpx.Client(timeout=30, follow_redirects=True) as client:
            res = client.get(body.url)
            res.raise_for_status()
            data = res.content
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail="Could not fetch the asset") from exc
    if len(data) > 100 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Asset too large")

    ctype = res.headers.get("content-type", "").split(";")[0].strip()
    ext = _EXT_BY_MIME.get(ctype) or (body.url.rsplit(".", 1)[-1].split("?")[0].lower() if "." in body.url else "bin")
    key = f"{workspace_id}/uploads/{uuid.uuid4()}.{ext}"
    kind = assets_repo.kind_from_key(key) or body.kind
    storage = get_storage()
    storage.put(key, data, ctype or "application/octet-stream")

    graph = dict(workflow.graph or {})
    nodes = list(graph.get("nodes") or [])
    nodes.append(
        {
            "id": f"node-{uuid.uuid4()}",
            "type": kind,
            "position": {"x": 240 + (len(nodes) % 4) * 300, "y": 140 + len(nodes) * 40},
            "data": {"kind": kind, "upload_key": key, "label": "stock"},
        }
    )
    graph["nodes"] = nodes
    workflow.graph = graph
    workflows_repo.save(session, workflow)
    return {"id": key, "kind": kind, "url": storage.url(key)}


@router.get("/stock/search")
def stock_search(
    q: str,
    kind: str = "image",
    _user: User = Depends(get_current_user),
) -> dict:
    """Search Pexels for stock images/videos. Returns normalized results whose
    `url` is an allow-listed Pexels CDN link — feed it to /import-url to add it."""
    from apps.api.app.core.config import settings

    if kind not in ("image", "video"):
        raise HTTPException(status_code=422, detail="kind must be image or video")
    if not settings.pexels_api_key:
        raise HTTPException(status_code=501, detail="Stock search is not configured")
    query = (q or "").strip()
    if not query:
        return {"results": []}

    import httpx

    base = "https://api.pexels.com/videos/search" if kind == "video" else "https://api.pexels.com/v1/search"
    try:
        with httpx.Client(timeout=15) as client:
            res = client.get(base, params={"query": query, "per_page": 24}, headers={"Authorization": settings.pexels_api_key})
            res.raise_for_status()
            payload = res.json()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail="Stock search failed") from exc

    results: list[dict] = []
    if kind == "video":
        for v in payload.get("videos") or []:
            files = sorted((f for f in v.get("video_files") or [] if f.get("link")), key=lambda f: f.get("height") or 0)
            # smallest file that is at least 720p, else the largest available
            pick = next((f for f in files if (f.get("height") or 0) >= 720), files[-1] if files else None)
            if not pick:
                continue
            results.append({"id": str(v.get("id")), "thumb": v.get("image"), "url": pick["link"], "kind": "video", "duration": v.get("duration")})
    else:
        for p in payload.get("photos") or []:
            src = p.get("src") or {}
            url = src.get("large") or src.get("original") or src.get("medium")
            if not url:
                continue
            results.append({"id": str(p.get("id")), "thumb": src.get("tiny") or src.get("small") or url, "url": url, "kind": "image"})
    return {"results": results}


class SubtitlesRequest(BaseModel):
    source_asset_id: str | None = None  # a pool asset; defaults to the first video/audio clip


@router.post("/projects/{project_id}/subtitles")
def generate_subtitles(
    project_id: uuid.UUID,
    body: SubtitlesRequest,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    """Transcribe the project's audio and return caption segments mapped to the
    timeline. Picks the source clip (given asset, else the first video/audio clip),
    transcribes its media via the shared OpenRouter pipeline, then maps each
    segment's media time onto the timeline (honouring the clip's trim + speed)."""
    from apps.api.app.features.clips.pipeline import _transcribe

    # editor calls carry the workflow id (like /generate), one project per workflow
    project = repository.get_by_workflow(session, workspace_id, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Editor project not found")

    tracks = (project.doc or {}).get("tracks") or []
    clips = [c for t in tracks for c in (t.get("clips") or []) if c.get("assetId")]
    # Choose the source clip: the requested asset, else the first video/audio clip.
    clip = None
    if body.source_asset_id:
        clip = next((c for c in clips if c.get("assetId") == body.source_asset_id), None)
    if clip is None:
        clip = next((c for c in clips if c.get("kind") in ("video", "audio")), None)
    if clip is None:
        raise HTTPException(status_code=422, detail="No video or audio clip to transcribe")

    workflow = workflows_repo.get(session, workspace_id, project.workflow_id)
    refmap = {item["id"]: item for item in (_workflow_media(session, workflow) if workflow else [])}
    item = refmap.get(clip["assetId"])
    if item is None:
        raise HTTPException(status_code=404, detail="Source media not found")

    storage = get_storage()
    c_start = float(clip.get("start") or 0)
    c_in = float(clip.get("in") or 0)
    c_out = float(clip.get("out") or (c_in + float(clip.get("duration") or 0)))
    speed = float(clip.get("speed") or 1) or 1

    with tempfile.TemporaryDirectory() as d:
        ext = os.path.splitext(item["key"])[1] or ".bin"
        path = os.path.join(d, f"src{ext}")
        with open(path, "wb") as f:
            f.write(storage.get(item["key"]))
        try:
            raw, _dur = _transcribe(path)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=502, detail=str(exc)) from exc

    out: list[dict] = []
    for seg in raw:
        s = float(seg.get("start") or 0)
        e = float(seg.get("end") or 0)
        if e <= c_in or s >= c_out:  # outside the trimmed region
            continue
        s = max(s, c_in)
        e = min(e, c_out)
        text = (seg.get("text") or "").strip()
        if not text:
            continue
        out.append(
            {
                "start": round(c_start + (s - c_in) / speed, 3),
                "end": round(c_start + (e - c_in) / speed, 3),
                "text": text,
            }
        )
    return {"segments": out}


_ENHANCE_FILTERS = {
    "denoise": "afftdn=nf=-25",
    "remove_silences": (
        "silenceremove=start_periods=1:start_threshold=-40dB:"
        "stop_periods=-1:stop_threshold=-40dB:stop_duration=0.5"
    ),
}


def _media_duration(exe: str, path: str) -> float:
    """Parse a media file's duration from ffmpeg's banner (no ffprobe dependency)."""
    proc = subprocess.run([exe, "-hide_banner", "-i", path], capture_output=True, text=True)
    for line in proc.stderr.splitlines():
        line = line.strip()
        if line.startswith("Duration:"):
            hms = line.split("Duration:", 1)[1].split(",", 1)[0].strip()
            try:
                h, m, s = hms.split(":")
                return int(h) * 3600 + int(m) * 60 + float(s)
            except ValueError:
                return 0.0
    return 0.0


class EnhanceRequest(BaseModel):
    clip_id: str
    op: str  # "denoise" | "remove_silences"


@router.post("/projects/{project_id}/enhance")
def enhance_clip_audio(
    project_id: uuid.UUID,
    body: EnhanceRequest,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    """Run an ffmpeg audio filter (denoise / remove-silences) on a clip's media and
    store the result as a new pool asset. Returns the new asset + duration so the
    editor can point the clip at it."""
    if body.op not in _ENHANCE_FILTERS:
        raise HTTPException(status_code=422, detail="Unknown enhancement")

    # editor calls carry the workflow id (like /generate), one project per workflow
    project = repository.get_by_workflow(session, workspace_id, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Editor project not found")

    clips = [
        c
        for t in (project.doc or {}).get("tracks", [])
        for c in (t.get("clips") or [])
    ]
    clip = next((c for c in clips if c.get("id") == body.clip_id), None)
    if clip is None or not clip.get("assetId"):
        raise HTTPException(status_code=404, detail="Clip not found")

    workflow = workflows_repo.get(session, workspace_id, project.workflow_id)
    refmap = {item["id"]: item for item in (_workflow_media(session, workflow) if workflow else [])}
    item = refmap.get(clip["assetId"])
    if item is None:
        raise HTTPException(status_code=404, detail="Source media not found")

    storage = get_storage()
    exe = imageio_ffmpeg.get_ffmpeg_exe()
    with tempfile.TemporaryDirectory() as d:
        ext = os.path.splitext(item["key"])[1] or ".bin"
        src = os.path.join(d, f"src{ext}")
        with open(src, "wb") as f:
            f.write(storage.get(item["key"]))
        out = os.path.join(d, "out.mp3")
        proc = subprocess.run(
            [exe, "-y", "-i", src, "-vn", "-af", _ENHANCE_FILTERS[body.op], "-c:a", "libmp3lame", "-q:a", "4", out],
            capture_output=True,
            text=True,
        )
        if proc.returncode != 0 or not os.path.exists(out):
            raise HTTPException(status_code=502, detail="Audio processing failed")
        data = open(out, "rb").read()
        duration = _media_duration(exe, out)

    key = f"{workspace_id}/edits/{uuid.uuid4()}.mp3"
    storage.put(key, data, "audio/mpeg")

    graph = dict(workflow.graph or {}) if workflow else {}
    nodes = list(graph.get("nodes") or [])
    nodes.append(
        {
            "id": f"node-{uuid.uuid4()}",
            "type": "audio",
            "position": {"x": 40, "y": 40 + len(nodes) * 40},
            "data": {"kind": "audio", "upload_key": key, "label": body.op},
        }
    )
    graph["nodes"] = nodes
    if workflow:
        workflow.graph = graph
        workflows_repo.save(session, workflow)

    return {"asset_id": key, "kind": "audio", "url": storage.url(key), "duration": round(duration, 3)}


_FILLERS = {"um", "uh", "er", "ah", "hmm", "mm", "erm", "uhm", "uhh", "umm", "mhm", "huh", "uhhh"}


class MagicCutRequest(BaseModel):
    clip_id: str


@router.post("/projects/{project_id}/magic-cut")
def magic_cut(
    project_id: uuid.UUID,
    body: MagicCutRequest,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    """Transcribe an audio clip and cut filler words (um/uh/...) — the audio-only
    part of 'Magic Cut'. Returns a new pool asset + its trimmed duration."""
    from apps.api.app.features.clips.pipeline import _transcribe

    project = repository.get_by_workflow(session, workspace_id, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Editor project not found")
    clip = next(
        (
            c
            for t in (project.doc or {}).get("tracks", [])
            for c in (t.get("clips") or [])
            if c.get("id") == body.clip_id
        ),
        None,
    )
    if clip is None or not clip.get("assetId") or clip.get("kind") != "audio":
        raise HTTPException(status_code=404, detail="Audio clip not found")

    workflow = workflows_repo.get(session, workspace_id, project.workflow_id)
    refmap = {item["id"]: item for item in (_workflow_media(session, workflow) if workflow else [])}
    item = refmap.get(clip["assetId"])
    if item is None:
        raise HTTPException(status_code=404, detail="Source media not found")

    storage = get_storage()
    exe = imageio_ffmpeg.get_ffmpeg_exe()
    with tempfile.TemporaryDirectory() as d:
        ext = os.path.splitext(item["key"])[1] or ".bin"
        src = os.path.join(d, f"src{ext}")
        with open(src, "wb") as f:
            f.write(storage.get(item["key"]))
        try:
            segs, total = _transcribe(src)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=502, detail=str(exc)) from exc

        # filler word time ranges (small pad so cuts don't clip neighbours)
        cuts: list[tuple[float, float]] = []
        for seg in segs:
            for w in seg.get("words") or []:
                token = str(w.get("w") or "").strip().lower().strip(".,!?;:")
                if token in _FILLERS:
                    cuts.append((max(0.0, float(w["s"]) - 0.05), float(w["e"]) + 0.05))
        cuts.sort()

        # keep = complement of the cuts across [0, total]
        keeps: list[tuple[float, float]] = []
        prev = 0.0
        for s, e in cuts:
            if s > prev:
                keeps.append((prev, s))
            prev = max(prev, e)
        keeps.append((prev, total))
        keeps = [(s, e) for s, e in keeps if e - s > 0.02]
        if not keeps:
            raise HTTPException(status_code=422, detail="Nothing left after cutting")

        out = os.path.join(d, "out.mp3")
        parts = [f"[0:a]atrim=start={s:.3f}:end={e:.3f},asetpts=N/SR/TB[a{i}]" for i, (s, e) in enumerate(keeps)]
        concat = "".join(f"[a{i}]" for i in range(len(keeps))) + f"concat=n={len(keeps)}:v=0:a=1[out]"
        fc = ";".join([*parts, concat])
        proc = subprocess.run(
            [exe, "-y", "-i", src, "-filter_complex", fc, "-map", "[out]", "-c:a", "libmp3lame", "-q:a", "4", out],
            capture_output=True,
            text=True,
        )
        if proc.returncode != 0 or not os.path.exists(out):
            raise HTTPException(status_code=502, detail="Magic cut failed")
        data = open(out, "rb").read()
        duration = _media_duration(exe, out)

    key = f"{workspace_id}/edits/{uuid.uuid4()}.mp3"
    storage.put(key, data, "audio/mpeg")
    graph = dict(workflow.graph or {}) if workflow else {}
    nodes = list(graph.get("nodes") or [])
    nodes.append(
        {
            "id": f"node-{uuid.uuid4()}",
            "type": "audio",
            "position": {"x": 40, "y": 40 + len(nodes) * 40},
            "data": {"kind": "audio", "upload_key": key, "label": "magic cut"},
        }
    )
    graph["nodes"] = nodes
    if workflow:
        workflow.graph = graph
        workflows_repo.save(session, workflow)

    return {"asset_id": key, "kind": "audio", "url": storage.url(key), "duration": round(duration, 3)}


class ChromaRequest(BaseModel):
    clip_id: str
    color: str | None = None  # key colour, default green


@router.post("/projects/{project_id}/chroma-key")
def chroma_key(
    project_id: uuid.UUID,
    body: ChromaRequest,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    """Chroma-key (green-screen) a video clip: remove the key colour and store a
    transparent webm as a new pool asset. (Editor calls carry the workflow id.)"""
    project = repository.get_by_workflow(session, workspace_id, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Editor project not found")
    clip = next(
        (
            c
            for t in (project.doc or {}).get("tracks", [])
            for c in (t.get("clips") or [])
            if c.get("id") == body.clip_id
        ),
        None,
    )
    if clip is None or not clip.get("assetId") or clip.get("kind") != "video":
        raise HTTPException(status_code=404, detail="Video clip not found")

    color = (body.color or "#00ff00").lstrip("#")
    if len(color) != 6 or any(ch not in "0123456789abcdefABCDEF" for ch in color):
        raise HTTPException(status_code=422, detail="color must be a #RRGGBB hex")

    workflow = workflows_repo.get(session, workspace_id, project.workflow_id)
    refmap = {item["id"]: item for item in (_workflow_media(session, workflow) if workflow else [])}
    item = refmap.get(clip["assetId"])
    if item is None:
        raise HTTPException(status_code=404, detail="Source media not found")

    storage = get_storage()
    exe = imageio_ffmpeg.get_ffmpeg_exe()
    with tempfile.TemporaryDirectory() as d:
        ext = os.path.splitext(item["key"])[1] or ".mp4"
        src = os.path.join(d, f"src{ext}")
        with open(src, "wb") as f:
            f.write(storage.get(item["key"]))
        out = os.path.join(d, "out.webm")
        proc = subprocess.run(
            [
                exe, "-y", "-i", src,
                "-vf", f"chromakey=0x{color}:0.1:0.1",
                "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "1M",
                "-c:a", "libopus",
                out,
            ],
            capture_output=True,
            text=True,
        )
        if proc.returncode != 0 or not os.path.exists(out):
            raise HTTPException(status_code=502, detail="Chroma-key failed")
        data = open(out, "rb").read()
        duration = _media_duration(exe, out)

    key = f"{workspace_id}/edits/{uuid.uuid4()}.webm"
    storage.put(key, data, "video/webm")
    graph = dict(workflow.graph or {}) if workflow else {}
    nodes = list(graph.get("nodes") or [])
    nodes.append(
        {
            "id": f"node-{uuid.uuid4()}",
            "type": "video",
            "position": {"x": 40, "y": 40 + len(nodes) * 40},
            "data": {"kind": "video", "upload_key": key, "label": "green screen"},
        }
    )
    graph["nodes"] = nodes
    if workflow:
        workflow.graph = graph
        workflows_repo.save(session, workflow)

    return {"asset_id": key, "kind": "video", "url": storage.url(key), "duration": round(duration, 3)}


class RemoveBgRequest(BaseModel):
    clip_id: str


# Replicate model run via /models/{owner}/{name}/predictions (latest version, no hash).
_REMBG_MODEL = "851-labs/background-remover"
_IMG_MIME = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp"}


def _settle_replicate(client, headers: dict, pred: dict, timeout_s: float = 90.0) -> dict:
    """Poll a Replicate prediction to a terminal state (Prefer:wait often returns
    it already). Blocks the worker thread — only viable for fast models."""
    import time

    terminal = {"succeeded", "failed", "canceled"}
    deadline = time.monotonic() + timeout_s
    while pred.get("status") not in terminal:
        if time.monotonic() > deadline:
            raise TimeoutError("prediction timed out")
        time.sleep(3)
        r = client.get(f"https://api.replicate.com/v1/predictions/{pred['id']}", headers=headers)
        r.raise_for_status()
        pred = r.json()
    if pred.get("status") != "succeeded":
        raise RuntimeError(str(pred.get("error") or pred.get("status")))
    return pred


@router.post("/projects/{project_id}/remove-bg")
def remove_bg(
    project_id: uuid.UUID,
    body: RemoveBgRequest,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    """Remove an image clip's background (Replicate matting model) and store the
    cutout PNG as a new pool asset. Video isn't supported here — use Green Screen.
    ponytail: synchronous + gated on REPLICATE_API_KEY; images settle in seconds."""
    from apps.api.app.core.config import settings

    project = repository.get_by_workflow(session, workspace_id, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Editor project not found")
    clip = next(
        (c for t in (project.doc or {}).get("tracks", []) for c in (t.get("clips") or []) if c.get("id") == body.clip_id),
        None,
    )
    if clip is None or not clip.get("assetId"):
        raise HTTPException(status_code=404, detail="Clip not found")
    if clip.get("kind") != "image":
        raise HTTPException(status_code=422, detail="Background removal supports images — use Green Screen for video")
    if not settings.replicate_api_key:
        raise HTTPException(status_code=501, detail="Background removal is not configured")

    workflow = workflows_repo.get(session, workspace_id, project.workflow_id)
    refmap = {item["id"]: item for item in (_workflow_media(session, workflow) if workflow else [])}
    item = refmap.get(clip["assetId"])
    if item is None:
        raise HTTPException(status_code=404, detail="Source media not found")

    import base64

    import httpx

    storage = get_storage()
    src_bytes = storage.get(item["key"])
    mime = _IMG_MIME.get(os.path.splitext(item["key"])[1].lower(), "image/png")
    data_uri = f"data:{mime};base64,{base64.b64encode(src_bytes).decode()}"
    headers = {"Authorization": f"Bearer {settings.replicate_api_key}"}
    try:
        with httpx.Client(timeout=120) as client:
            res = client.post(
                f"https://api.replicate.com/v1/models/{_REMBG_MODEL}/predictions",
                headers={**headers, "Prefer": "wait=60"},
                json={"input": {"image": data_uri}},
            )
            res.raise_for_status()
            pred = _settle_replicate(client, headers, res.json())
            output = pred.get("output")
            url = output[0] if isinstance(output, list) else output
            if not isinstance(url, str):
                raise RuntimeError("no image output")
            out_bytes = client.get(url).content
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail="Background removal failed") from exc

    key = f"{workspace_id}/edits/{uuid.uuid4()}.png"
    storage.put(key, out_bytes, "image/png")
    graph = dict(workflow.graph or {}) if workflow else {}
    nodes = list(graph.get("nodes") or [])
    nodes.append(
        {
            "id": f"node-{uuid.uuid4()}",
            "type": "image",
            "position": {"x": 40, "y": 40 + len(nodes) * 40},
            "data": {"kind": "image", "upload_key": key, "label": "cutout"},
        }
    )
    graph["nodes"] = nodes
    if workflow:
        workflow.graph = graph
        workflows_repo.save(session, workflow)
    return {"asset_id": key, "kind": "image", "url": storage.url(key)}


class DetachRequest(BaseModel):
    clip_id: str


@router.post("/projects/{project_id}/detach-audio")
def detach_audio(
    project_id: uuid.UUID,
    body: DetachRequest,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    """Extract a clip's audio track into a new pool asset (mp3), so the editor can
    place it as its own audio clip. (Editor calls carry the workflow id.)"""
    project = repository.get_by_workflow(session, workspace_id, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Editor project not found")

    clip = next(
        (
            c
            for t in (project.doc or {}).get("tracks", [])
            for c in (t.get("clips") or [])
            if c.get("id") == body.clip_id
        ),
        None,
    )
    if clip is None or not clip.get("assetId"):
        raise HTTPException(status_code=404, detail="Clip not found")

    workflow = workflows_repo.get(session, workspace_id, project.workflow_id)
    refmap = {item["id"]: item for item in (_workflow_media(session, workflow) if workflow else [])}
    item = refmap.get(clip["assetId"])
    if item is None:
        raise HTTPException(status_code=404, detail="Source media not found")

    storage = get_storage()
    exe = imageio_ffmpeg.get_ffmpeg_exe()
    with tempfile.TemporaryDirectory() as d:
        ext = os.path.splitext(item["key"])[1] or ".bin"
        src = os.path.join(d, f"src{ext}")
        with open(src, "wb") as f:
            f.write(storage.get(item["key"]))
        out = os.path.join(d, "out.mp3")
        proc = subprocess.run(
            [exe, "-y", "-i", src, "-vn", "-c:a", "libmp3lame", "-q:a", "4", out],
            capture_output=True,
            text=True,
        )
        if proc.returncode != 0 or not os.path.exists(out):
            raise HTTPException(status_code=502, detail="No audio track found")
        data = open(out, "rb").read()
        duration = _media_duration(exe, out)

    key = f"{workspace_id}/edits/{uuid.uuid4()}.mp3"
    storage.put(key, data, "audio/mpeg")
    graph = dict(workflow.graph or {}) if workflow else {}
    nodes = list(graph.get("nodes") or [])
    nodes.append(
        {
            "id": f"node-{uuid.uuid4()}",
            "type": "audio",
            "position": {"x": 40, "y": 40 + len(nodes) * 40},
            "data": {"kind": "audio", "upload_key": key, "label": "detached audio"},
        }
    )
    graph["nodes"] = nodes
    if workflow:
        workflow.graph = graph
        workflows_repo.save(session, workflow)

    return {"asset_id": key, "kind": "audio", "url": storage.url(key), "duration": round(duration, 3)}


def _flatten_project(session: Session, project, workflow) -> tuple[dict, list[dict]]:
    """Return a self-contained (doc, media) where every clip's assetId is a stable
    storage key and media is the list of {kind, key} those keys need — so the doc can
    be rehydrated into a fresh workflow (used by both duplicate and templates)."""
    # pool id -> {kind, key}. For generated assets id is a UUID, for uploads it is the key.
    pool = {item["id"]: item for item in _workflow_media(session, workflow)}
    doc = copy.deepcopy(project.doc or {})
    used: dict[str, dict] = {}
    for track in doc.get("tracks") or []:
        for clip in track.get("clips") or []:
            aid = clip.get("assetId")
            item = pool.get(aid) if aid else None
            if item is None:
                continue
            clip["assetId"] = item["key"]  # reference media by its stable key
            used[item["key"]] = item
    return doc, [{"kind": i["kind"], "key": i["key"]} for i in used.values()]


def _create_project_from(session: Session, workspace_id: uuid.UUID, name: str, title: str, doc: dict, media: list[dict]) -> uuid.UUID:
    """Rehydrate a flattened (doc, media) into a fresh workflow + editor project."""
    nodes = [
        {
            "id": f"node-{uuid.uuid4()}",
            "type": item["kind"],
            "position": {"x": 240 + (i % 4) * 300, "y": 140 + i * 40},
            "data": {"kind": item["kind"], "upload_key": item["key"], "label": "media"},
        }
        for i, item in enumerate(media)
    ]
    new_wf = workflows_repo.add(
        session,
        Workflow(workspace_id=workspace_id, name=name, graph={"nodes": nodes, "edges": []}),
    )
    repository.add(session, VideoEditorProject(workspace_id=workspace_id, workflow_id=new_wf.id, title=title, doc=doc))
    return new_wf.id


@router.post("/projects/{workflow_id}/duplicate")
def duplicate_project(
    workflow_id: uuid.UUID,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    """Clone the project into a fresh workflow. The media pool is flattened to
    upload references (same storage keys — no re-generation), and the doc's clip
    asset ids are remapped onto those keys so every clip still resolves."""
    project = repository.get_by_workflow(session, workspace_id, workflow_id)
    workflow = workflows_repo.get(session, workspace_id, workflow_id)
    if project is None or workflow is None:
        raise HTTPException(status_code=404, detail="Project not found")
    doc, media = _flatten_project(session, project, workflow)
    new_id = _create_project_from(session, workspace_id, f"{workflow.name} (copy)", f"{project.title} (copy)", doc, media)
    return {"workflow_id": str(new_id)}


# ── Brand Kit (stored in workspace.preferences — no migration needed) ────────


def _brand_kit(ws: Workspace) -> list[dict]:
    return list((ws.preferences or {}).get("brand_kit") or [])


def _save_brand_kit(session: Session, ws: Workspace, items: list[dict]) -> None:
    prefs = dict(ws.preferences or {})
    prefs["brand_kit"] = items
    ws.preferences = prefs  # reassign so the JSON column is marked dirty
    session.add(ws)
    session.commit()


def _brand_item_out(item: dict, storage) -> dict:
    out = {"id": item["id"], "kind": item["kind"], "name": item.get("name") or item["kind"]}
    if item.get("color"):
        out["color"] = item["color"]
    if item.get("font"):
        out["font"] = item["font"]
    if item.get("key"):
        out["url"] = storage.url(item["key"])
    return out


@router.get("/brand-kit")
def list_brand_kit(
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    ws = session.get(Workspace, workspace_id)
    if ws is None:
        raise HTTPException(status_code=404, detail="Workspace not found")
    storage = get_storage()
    return {"items": [_brand_item_out(i, storage) for i in _brand_kit(ws)]}


class BrandKitAdd(BaseModel):
    kind: str  # video | audio | image | color | font
    workflow_id: uuid.UUID | None = None
    asset_id: str | None = None
    color: str | None = None
    font: str | None = None  # CSS font-family string for kind == "font"
    name: str | None = None


@router.post("/brand-kit")
def add_brand_kit(
    body: BrandKitAdd,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    ws = session.get(Workspace, workspace_id)
    if ws is None:
        raise HTTPException(status_code=404, detail="Workspace not found")

    item = {"id": str(uuid.uuid4()), "kind": body.kind, "created_at": datetime.now(UTC).isoformat()}
    if body.kind == "color":
        if not body.color:
            raise HTTPException(status_code=422, detail="color is required")
        item["color"] = body.color
        item["name"] = body.name or body.color
    elif body.kind == "font":
        if not body.font:
            raise HTTPException(status_code=422, detail="font is required")
        item["font"] = body.font
        item["name"] = body.name or body.font.split(",")[0].strip()
    else:
        if not (body.workflow_id and body.asset_id):
            raise HTTPException(status_code=422, detail="workflow_id and asset_id are required")
        workflow = workflows_repo.get(session, workspace_id, body.workflow_id)
        refmap = {m["id"]: m for m in (_workflow_media(session, workflow) if workflow else [])}
        media = refmap.get(body.asset_id)
        if media is None:
            raise HTTPException(status_code=404, detail="Asset not found")
        item["key"] = media["key"]
        item["name"] = body.name or media["key"].rsplit("/", 1)[-1]

    items = _brand_kit(ws)
    items.append(item)
    _save_brand_kit(session, ws, items)
    return _brand_item_out(item, get_storage())


@router.delete("/brand-kit/{item_id}")
def remove_brand_kit(
    item_id: str,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    ws = session.get(Workspace, workspace_id)
    if ws is None:
        raise HTTPException(status_code=404, detail="Workspace not found")
    _save_brand_kit(session, ws, [i for i in _brand_kit(ws) if i.get("id") != item_id])
    return {"ok": True}


@router.post("/projects/{workflow_id}/brand-kit/{item_id}/add")
def add_brand_kit_to_project(
    workflow_id: uuid.UUID,
    item_id: str,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    """Drop a saved brand-kit asset into the current project's media pool."""
    ws = session.get(Workspace, workspace_id)
    workflow = workflows_repo.get(session, workspace_id, workflow_id)
    if ws is None or workflow is None:
        raise HTTPException(status_code=404, detail="Not found")
    item = next((i for i in _brand_kit(ws) if i.get("id") == item_id), None)
    if item is None or not item.get("key"):
        raise HTTPException(status_code=404, detail="Brand kit item not found")

    key = item["key"]
    kind = assets_repo.kind_from_key(key) or item.get("kind") or "image"
    graph = dict(workflow.graph or {})
    nodes = list(graph.get("nodes") or [])
    if not any((n.get("data") or {}).get("upload_key") == key for n in nodes):
        nodes.append(
            {
                "id": f"node-{uuid.uuid4()}",
                "type": kind,
                "position": {"x": 40, "y": 40 + len(nodes) * 40},
                "data": {"kind": kind, "upload_key": key, "label": item.get("name") or "brand kit"},
            }
        )
        graph["nodes"] = nodes
        workflow.graph = graph
        workflows_repo.save(session, workflow)
    return {"id": key, "kind": kind, "url": get_storage().url(key)}


# ── Version history (doc snapshots in workspace.preferences — no migration) ──

_MAX_VERSIONS = 20


def _versions(ws: Workspace, wid: uuid.UUID) -> list[dict]:
    return list(((ws.preferences or {}).get("versions") or {}).get(str(wid)) or [])


def _save_versions(session: Session, ws: Workspace, wid: uuid.UUID, vers: list[dict]) -> None:
    prefs = dict(ws.preferences or {})
    all_versions = dict(prefs.get("versions") or {})
    all_versions[str(wid)] = vers
    prefs["versions"] = all_versions
    ws.preferences = prefs
    session.add(ws)
    session.commit()


class SaveVersionRequest(BaseModel):
    doc: dict
    label: str | None = None


@router.post("/projects/{workflow_id}/versions")
def save_version(
    workflow_id: uuid.UUID,
    body: SaveVersionRequest,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    ws = session.get(Workspace, workspace_id)
    workflow = workflows_repo.get(session, workspace_id, workflow_id)
    if ws is None or workflow is None:
        raise HTTPException(status_code=404, detail="Project not found")
    version = {"id": str(uuid.uuid4()), "ts": datetime.now(UTC).isoformat(), "label": body.label, "doc": body.doc}
    vers = [version, *_versions(ws, workflow_id)][:_MAX_VERSIONS]
    _save_versions(session, ws, workflow_id, vers)
    return {"id": version["id"], "ts": version["ts"], "label": version["label"]}


@router.get("/projects/{workflow_id}/versions")
def list_versions(
    workflow_id: uuid.UUID,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    ws = session.get(Workspace, workspace_id)
    if ws is None:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return {"versions": [{"id": v["id"], "ts": v["ts"], "label": v.get("label")} for v in _versions(ws, workflow_id)]}


@router.post("/projects/{workflow_id}/versions/{version_id}/restore")
def restore_version(
    workflow_id: uuid.UUID,
    version_id: str,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    ws = session.get(Workspace, workspace_id)
    if ws is None:
        raise HTTPException(status_code=404, detail="Workspace not found")
    version = next((v for v in _versions(ws, workflow_id) if v["id"] == version_id), None)
    if version is None:
        raise HTTPException(status_code=404, detail="Version not found")
    return {"doc": version["doc"]}


# ── Templates (self-contained doc snapshots in workspace.preferences) ─────────

_MAX_TEMPLATES = 50


def _templates(ws: Workspace) -> list[dict]:
    return list((ws.preferences or {}).get("templates") or [])


def _save_templates(session: Session, ws: Workspace, items: list[dict]) -> None:
    prefs = dict(ws.preferences or {})
    prefs["templates"] = items
    ws.preferences = prefs  # reassign so the JSON column is marked dirty
    session.add(ws)
    session.commit()


def _template_out(t: dict) -> dict:
    tracks = (t.get("doc") or {}).get("tracks") or []
    return {"id": t["id"], "name": t["name"], "ts": t["ts"], "clips": sum(len(tr.get("clips") or []) for tr in tracks)}


class SaveTemplateRequest(BaseModel):
    workflow_id: uuid.UUID
    name: str | None = None


@router.post("/templates")
def save_template(
    body: SaveTemplateRequest,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    """Snapshot a project as a reusable template — flattened to stable storage keys
    (same media, no re-generation) so it can be spun into a fresh project anytime."""
    ws = session.get(Workspace, workspace_id)
    project = repository.get_by_workflow(session, workspace_id, body.workflow_id)
    workflow = workflows_repo.get(session, workspace_id, body.workflow_id)
    if ws is None or project is None or workflow is None:
        raise HTTPException(status_code=404, detail="Project not found")
    doc, media = _flatten_project(session, project, workflow)
    tpl = {
        "id": str(uuid.uuid4()),
        "name": (body.name or project.title or "Untitled").strip() or "Untitled",
        "ts": datetime.now(UTC).isoformat(),
        "doc": doc,
        "media": media,
    }
    _save_templates(session, ws, [tpl, *_templates(ws)][:_MAX_TEMPLATES])
    return _template_out(tpl)


@router.get("/templates")
def list_templates(
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    ws = session.get(Workspace, workspace_id)
    if ws is None:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return {"templates": [_template_out(t) for t in _templates(ws)]}


@router.post("/templates/{template_id}/use")
def use_template(
    template_id: str,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    """Spin a template into a fresh workflow + editor project; returns its workflow id."""
    ws = session.get(Workspace, workspace_id)
    if ws is None:
        raise HTTPException(status_code=404, detail="Workspace not found")
    tpl = next((t for t in _templates(ws) if t["id"] == template_id), None)
    if tpl is None:
        raise HTTPException(status_code=404, detail="Template not found")
    doc = copy.deepcopy(tpl["doc"])
    new_id = _create_project_from(session, workspace_id, tpl["name"], tpl["name"], doc, tpl.get("media") or [])
    return {"workflow_id": str(new_id)}


@router.delete("/templates/{template_id}")
def remove_template(
    template_id: str,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    ws = session.get(Workspace, workspace_id)
    if ws is None:
        raise HTTPException(status_code=404, detail="Workspace not found")
    _save_templates(session, ws, [t for t in _templates(ws) if t["id"] != template_id])
    return {"ok": True}


class ProjectUpdate(BaseModel):
    title: str | None = None
    doc: dict | None = None


@router.patch("/projects/{project_id}")
def update_project(
    project_id: uuid.UUID,
    body: ProjectUpdate,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    project = repository.get(session, workspace_id, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Editor project not found")
    if body.title is not None:
        project.title = body.title
    if body.doc is not None:
        project.doc = body.doc
    repository.save(session, project)
    return {"id": str(project.id), "title": project.title}


@router.post("/projects/{project_id}/render")
def render_project(
    project_id: uuid.UUID,
    format: str = "mp4",
    height: int | None = None,  # output height (e.g. 720/1080); width follows aspect
    fps: int | None = None,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    """Composite the timeline via ffmpeg and store it. format=mp4 (default) or gif;
    optional height/fps override the canvas resolution and frame rate."""
    if format not in ("mp4", "gif"):
        raise HTTPException(status_code=422, detail="format must be 'mp4' or 'gif'")
    project = repository.get(session, workspace_id, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Editor project not found")

    workflow = workflows_repo.get(session, workspace_id, project.workflow_id)
    refmap = {item["id"]: item for item in (_workflow_media(session, workflow) if workflow else [])}
    used = {
        clip.get("assetId")
        for track in (project.doc or {}).get("tracks", [])
        for clip in track.get("clips", [])
        if clip.get("assetId")
    }
    storage = get_storage()
    exe = imageio_ffmpeg.get_ffmpeg_exe()

    with tempfile.TemporaryDirectory() as d:
        sources: dict[str, dict] = {}
        for ref in used:
            item = refmap.get(ref)
            if not item:
                continue
            ext = os.path.splitext(item["key"])[1] or ".bin"
            path = os.path.join(d, f"{ref.replace('/', '_')}{ext}")
            with open(path, "wb") as f:
                f.write(storage.get(item["key"]))
            kind = (
                "image"
                if item["kind"] == "image"
                else "audio"
                if item["kind"] == "audio"
                else "video"
            )
            sources[ref] = {"path": path, "kind": kind}

        # Apply resolution / fps overrides on a copy of the doc.
        doc = project.doc
        if height or fps:
            doc = dict(project.doc)
            if height and int(doc.get("height") or 0):
                scale = height / int(doc["height"])
                doc["height"] = height
                doc["width"] = round(int(doc.get("width") or 1080) * scale / 2) * 2
            if fps:
                doc["fps"] = fps

        text_ass = build_text_ass(doc)
        ass_path = None
        if text_ass:
            ass_path = os.path.join(d, "text.ass")
            with open(ass_path, "w", encoding="utf-8") as f:
                f.write(text_ass)
        input_args, filter_complex, post, total = build_render_args(doc, sources, ass_path)
        out = os.path.join(d, "out.mp4")
        cmd = [exe, "-y", *input_args, "-filter_complex", filter_complex, *post, out]
        proc = subprocess.run(cmd, capture_output=True, timeout=900)
        if proc.returncode != 0 or not os.path.exists(out) or os.path.getsize(out) == 0:
            raise HTTPException(
                status_code=422,
                detail=f"Render failed: {proc.stderr.decode(errors='ignore')[-400:]}",
            )

        if format == "gif":
            # Two-pass palette for a decent GIF; capped size/fps to keep it shareable.
            gif = os.path.join(d, "out.gif")
            vf = "fps=12,scale=480:-2:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse"
            proc = subprocess.run(
                [exe, "-y", "-i", out, "-filter_complex", vf, gif], capture_output=True, timeout=300
            )
            if proc.returncode != 0 or not os.path.exists(gif) or os.path.getsize(gif) == 0:
                raise HTTPException(
                    status_code=422,
                    detail=f"GIF conversion failed: {proc.stderr.decode(errors='ignore')[-400:]}",
                )
            with open(gif, "rb") as f:
                data = f.read()
            key = f"{workspace_id}/renders/{uuid.uuid4()}.gif"
            storage.put(key, data, "image/gif")
            return {"key": key, "url": storage.url(key), "kind": "gif", "duration": total}

        with open(out, "rb") as f:
            data = f.read()

    key = f"{workspace_id}/renders/{uuid.uuid4()}.mp4"
    storage.put(key, data, "video/mp4")
    # Shared watch pages play the latest render.
    project.last_render_key = key
    repository.save(session, project)
    return {"key": key, "url": storage.url(key), "kind": "video", "duration": total}


# ── share links + public watch/review endpoints ─────────────────────────────


class ShareRequest(BaseModel):
    mode: str  # "review" | "presentation"
    revoke: bool = False


@router.post("/projects/{project_id}/share")
def share_project(
    project_id: uuid.UUID,
    body: ShareRequest,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    """Create (or revoke) a public share link. Requires a render to exist so the
    shared page has a video to play."""
    if body.mode not in ("review", "presentation"):
        raise HTTPException(status_code=422, detail="mode must be 'review' or 'presentation'")
    project = repository.get(session, workspace_id, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Editor project not found")

    field = "share_review_token" if body.mode == "review" else "share_present_token"
    if body.revoke:
        setattr(project, field, None)
        repository.save(session, project)
        return {"mode": body.mode, "token": None}

    if not project.last_render_key:
        raise HTTPException(
            status_code=409,
            detail="Export the video first — the share page plays the latest render.",
        )
    token = getattr(project, field) or uuid.uuid4().hex
    setattr(project, field, token)
    repository.save(session, project)
    return {"mode": body.mode, "token": token}


@router.get("/shared/{token}")
def get_shared(token: str, session: Session = Depends(get_session)) -> dict:
    """Public: everything a share page needs. No auth — the token is the secret."""
    hit = repository.get_by_token(session, token)
    if hit is None:
        raise HTTPException(status_code=404, detail="This link is invalid or was revoked.")
    project, mode = hit
    if not project.last_render_key:
        raise HTTPException(status_code=404, detail="Nothing rendered for this link yet.")
    storage = get_storage()
    out = {
        "title": project.title,
        "mode": mode,
        "video_url": storage.url(project.last_render_key),
    }
    if mode == "review":
        out["comments"] = [
            {
                "id": str(c.id),
                "author": c.author,
                "text": c.text,
                "at": c.at,
                "created_at": c.created_at.isoformat(),
            }
            for c in repository.comments_for(session, project.id)
        ]
    return out


class CommentRequest(BaseModel):
    author: str
    text: str
    at: float = 0.0


@router.post("/shared/{token}/comments")
def add_shared_comment(
    token: str, body: CommentRequest, session: Session = Depends(get_session)
) -> dict:
    """Public: leave a review comment. Only review links accept comments."""
    hit = repository.get_by_token(session, token)
    if hit is None:
        raise HTTPException(status_code=404, detail="This link is invalid or was revoked.")
    project, mode = hit
    if mode != "review":
        raise HTTPException(status_code=403, detail="This link is view-only.")
    author = (body.author or "").strip()[:60] or "Anonymous"
    text = (body.text or "").strip()
    if not text:
        raise HTTPException(status_code=422, detail="Comment text is required")
    comment = repository.add_comment(
        session,
        VideoEditorComment(
            project_id=project.id, author=author, text=text[:2000], at=max(0.0, float(body.at))
        ),
    )
    return {
        "id": str(comment.id),
        "author": comment.author,
        "text": comment.text,
        "at": comment.at,
        "created_at": comment.created_at.isoformat(),
    }


class PublishBody(BaseModel):
    render_key: str  # storage key of a prior /render (workspace-scoped)
    account_ids: list[str]
    title: str = ""
    caption: str = ""
    tiktok_privacy: str | None = None  # e.g. SELF_ONLY / PUBLIC_TO_EVERYONE


@router.post("/projects/{project_id}/publish", status_code=201)
def publish_project(
    project_id: uuid.UUID,
    body: PublishBody,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> list[dict]:
    """Publish a rendered editor MP4 to the selected connected accounts. Creates
    one ScheduledPost per account (poll GET /clips/schedule for live status),
    the same tracking clip publishing uses. Client renders first (POST /render)."""
    from datetime import UTC, datetime

    from apps.api.app.features.clips.models import ScheduledPost

    project = repository.get(session, workspace_id, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Editor project not found")
    if not body.render_key.startswith(f"{workspace_id}/"):
        raise HTTPException(status_code=403, detail="That render isn't yours to publish.")
    ids = [uuid.UUID(a) for a in body.account_ids]
    accounts = session.exec(
        select(SocialAccount).where(
            SocialAccount.workspace_id == workspace_id, SocialAccount.id.in_(ids)
        )
    ).all()
    if not accounts:
        raise HTTPException(status_code=400, detail="Pick at least one connected account.")

    title = body.title or project.title or "Video"
    now = datetime.now(UTC).replace(tzinfo=None)
    posts = []
    for acc in accounts:
        opts = (
            {"privacy_level": body.tiktok_privacy}
            if acc.platform == "tiktok" and body.tiktok_privacy
            else None
        )
        post = ScheduledPost(
            workspace_id=workspace_id,
            render_key=body.render_key,
            title=title,
            post_at=now,
            status="posting",
            social_account_id=acc.id,
            platform=acc.platform,
            caption=(body.caption or "").strip() or None,
            options=opts,
        )
        session.add(post)
        posts.append((post, acc))
    session.commit()
    for post, _ in posts:
        celery_app.send_task("publish_post", args=[str(post.id)])
    return [
        {
            "id": str(post.id),
            "clip_id": None,
            "status": post.status,
            "platform": post.platform,
            "account": acc.username,
            "result_url": post.result_url,
            "error": post.error,
        }
        for post, acc in posts
    ]
