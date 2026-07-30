"""Every clips job is a project: a workflow is created the moment clipping
starts (so it appears in Projects/recents immediately) and populated with the
finished clips when the pipeline completes."""

from __future__ import annotations

import uuid

from sqlmodel import Session

from apps.api.app.features.clips.models import ClipsJob
from apps.api.app.features.clips.pipeline import RATIO_SIZES


def editor_doc_from_job(job: ClipsJob, clips: list[dict] | None = None) -> dict:
    """Timeline doc for the editor: clips laid out sequentially on a video
    track, captions as SEPARATE text clips linked via parentClipId."""
    w, h = RATIO_SIZES.get((job.params or {}).get("ratio") or "9:16", RATIO_SIZES["9:16"])

    def _base(kind: str, start: float, dur: float) -> dict:
        return {
            "id": uuid.uuid4().hex,
            "kind": kind,
            "start": round(start, 2),
            "duration": round(dur, 2),
            "in": 0.0,
            "out": round(dur, 2),
            "speed": 1.0,
            "volume": 1.0,
            "transform": {"x": 0, "y": 0, "scale": 1, "rotation": 0, "opacity": 1},
            "keyframes": [],
            "effects": [],
        }

    video_clips: list[dict] = []
    text_clips: list[dict] = []
    t = 0.0
    for clip in clips if clips is not None else job.clips:
        if not clip.get("key"):
            continue
        dur = float(clip["end"]) - float(clip["start"])
        vc = {**_base("video", t, dur), "assetId": clip["key"]}
        video_clips.append(vc)
        segments = clip.get("caption_edits") or [
            s
            for s in (job.transcript or [])
            if s["end"] > clip["start"] and s["start"] < clip["end"]
        ]
        for seg in segments:
            s = max(float(seg["start"]), float(clip["start"]))
            e = min(float(seg["end"]), float(clip["end"]))
            text = (seg.get("text") or "").strip()
            if e - s < 0.2 or not text:
                continue
            tc = {
                **_base("text", t + (s - float(clip["start"])), e - s),
                "text": {"content": text},
                "parentClipId": vc["id"],
            }
            text_clips.append(tc)
        t += dur

    def _track(kind: str, name: str, clips_: list[dict]) -> dict:
        return {
            "id": uuid.uuid4().hex,
            "kind": kind,
            "name": name,
            "locked": False,
            "hidden": False,
            "muted": False,
            "clips": clips_,
        }

    tracks = [_track("video", "V1", video_clips)]
    if text_clips:
        tracks.append(_track("text", "Captions", text_clips))
    tracks.append(_track("video", "Track", []))
    return {
        "version": 1,
        "fps": 30,
        "width": w,
        "height": h,
        "duration": t,
        "background": "#000000",
        "tracks": tracks,
        "markers": [],
    }


def clip_nodes(job: ClipsJob, clips: list[dict]) -> list[dict]:
    """Canvas upload nodes for the job's clips (the shared media pool)."""
    return [
        {
            "id": f"node-{uuid.uuid4()}",
            "type": "video",
            "position": {"x": 240 + (i % 4) * 320, "y": 140 + (i // 4) * 260},
            "data": {
                "kind": "video",
                "upload_key": clip["key"],
                "upload_name": f"{clip.get('title') or f'Clip {i + 1}'}.mp4",
                "label": clip.get("title") or f"Clip {i + 1}",
            },
        }
        for i, clip in enumerate(clips)
        if clip.get("key")
    ]


def create_project_for_job(session: Session, job: ClipsJob) -> None:
    """Called at job creation: an (empty) project so the job shows up in
    Projects/recents right away."""
    from apps.api.app.features.workflows import repository as workflows_repo
    from apps.api.app.features.workflows.models import Workflow

    workflow = workflows_repo.add(
        session,
        Workflow(
            workspace_id=job.workspace_id,
            name=(job.source_title or "Clips project")[:80],
            graph={"nodes": [], "edges": []},
        ),
    )
    job.workflow_id = workflow.id


def populate_project(session: Session, job: ClipsJob) -> None:
    """Called on completion: fill the linked project with the clips (canvas
    nodes + seeded timeline). Never fails the job."""
    from apps.api.app.features.video_editor import repository as editor_repo
    from apps.api.app.features.video_editor.models import VideoEditorProject
    from apps.api.app.features.workflows import repository as workflows_repo

    if not job.workflow_id:
        return
    workflow = workflows_repo.get(session, job.workspace_id, job.workflow_id)
    if workflow is None:
        return
    workflow.graph = {"nodes": clip_nodes(job, job.clips or []), "edges": []}
    if job.source_title and workflow.name == "Clips project":
        workflow.name = job.source_title[:80]
    workflows_repo.save(session, workflow)
    if editor_repo.get_by_workflow(session, job.workspace_id, job.workflow_id) is None:
        editor_repo.add(
            session,
            VideoEditorProject(
                workspace_id=job.workspace_id,
                workflow_id=job.workflow_id,
                title=workflow.name,
                doc=editor_doc_from_job(job),
            ),
        )
