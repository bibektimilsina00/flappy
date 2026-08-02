"""Direct publishing: post one scheduled clip to its connected account.
Dispatched immediately by "Publish now" and by beat when scheduled posts
come due (see cleanup.promote_due_posts)."""

import logging
import uuid

from sqlmodel import Session

from apps.api.app.core.celery import celery_app
from apps.api.app.core.database import engine
from apps.api.app.features.clips.models import ClipsJob, ScheduledPost
from apps.api.app.features.social import publishers
from apps.api.app.features.social.models import SocialAccount
from apps.api.app.storage.factory import get_storage

log = logging.getLogger(__name__)


@celery_app.task(name="publish_post")
def publish_post(post_id: str) -> None:
    with Session(engine) as session:
        post = session.get(ScheduledPost, uuid.UUID(post_id))
        if post is None or post.status in ("posted", "canceled"):
            return
        account = (
            session.get(SocialAccount, post.social_account_id) if post.social_account_id else None
        )
        if account is None:
            post.status = "failed"
            post.error = "The connected account no longer exists."
            session.add(post)
            session.commit()
            return
        storage = get_storage()

        # Editor-render post carries the MP4 key directly; clip post resolves a
        # captions-burned key from the job's clip.
        if post.render_key:
            key: str | None = post.render_key
            title = post.title or "Video"
        else:
            job = session.get(ClipsJob, post.job_id) if post.job_id else None
            clip = next(
                (c for c in (job.clips if job else []) or [] if c.get("id") == post.clip_id), None
            )
            if job is None or clip is None or not clip.get("key"):
                post.status = "failed"
                post.error = "The clip no longer exists."
                session.add(post)
                session.commit()
                return
            key = _publish_key(session, job, clip, storage)
            title = post.title or clip.get("title") or "Clip"

        post.status = "posting"
        session.add(post)
        session.commit()
        try:
            result = publishers.publish(
                session,
                account,
                video_url=storage.url(key),
                video_bytes=lambda: storage.get(key),
                title=title,
                caption=post.caption or title or "",
                options=post.options,
            )
            post.status = "posted"
            post.result_url = result
            post.error = None
        except Exception as e:  # noqa: BLE001 — any platform error lands on the post row
            log.exception("publish failed for post %s", post_id)
            post.status = "failed"
            post.error = str(e)[:500]
        session.add(post)
        session.commit()


def _publish_key(session: Session, job: ClipsJob, clip: dict, storage) -> str:
    """Captions burned in the job's style — the same artifact download makes."""
    from apps.api.app.features.clips.pipeline import BURN_VERSION, burn_clip_captions

    params = job.params or {}
    style = (params.get("caption_style") or "clean") if params.get("captions", True) else None
    if not style or not clip.get("clean"):
        return clip["key"]
    cached = (clip.get("burned") or {}).get(f"{style}#v{BURN_VERSION}")
    if cached:
        return cached
    key = burn_clip_captions(job, clip, style, storage)
    if key:
        job.clips = list(job.clips)  # new list object so the JSON column is marked dirty
        session.add(job)
        session.commit()
    return key or clip["key"]
