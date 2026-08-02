"""Timeline editor project: load (seed on first open) + autosave.

The editor doc is the declarative EditorDoc (VIDEO-EDITOR-PLAN.md §4). On first
open for a workflow we seed a basic timeline from the workflow's assets.
"""

import os
import subprocess
import tempfile
import uuid

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
    kind: str  # "image" | "video"
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
    if body.kind not in ("image", "video"):
        raise HTTPException(status_code=422, detail="kind must be 'image' or 'video'")
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


@router.post("/projects/{project_id}/publish", status_code=202)
def publish_project(
    project_id: uuid.UUID,
    body: PublishBody,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    """Publish a rendered editor MP4 to the selected connected accounts. The
    client renders first (POST /render) and passes that render's key here."""
    project = repository.get(session, workspace_id, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Editor project not found")
    # Only publish a render this workspace owns.
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
    for acc in accounts:
        celery_app.send_task(
            "publish_editor_render", args=[str(acc.id), body.render_key, title, body.caption]
        )
    return {"dispatched": len(accounts)}
