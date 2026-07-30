"""Per-platform video publishing. Each publisher gets a fresh token, a
presigned video URL (for platforms that pull) and a bytes thunk (for platforms
that want an upload), and returns the URL of the published post. Runs inside
the Celery worker — blocking polls are fine here."""

from __future__ import annotations

import logging
import time
from datetime import datetime, timezone

import httpx
from sqlmodel import Session

from apps.api.app.features.social import oauth
from apps.api.app.features.social.models import SocialAccount

log = logging.getLogger(__name__)


def fresh_token(session: Session, account: SocialAccount) -> str:
    """Refresh a near-expiry token (google/tiktok/ig-login). Meta page tokens don't expire."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if account.token_expires_at is None or account.token_expires_at > now:
        return account.access_token
    if (account.meta or {}).get("ig_login"):
        # IG long-lived tokens refresh with themselves (works only while still valid;
        # ponytail: a token expired for weeks needs a reconnect, not a refresh)
        with httpx.Client(timeout=20) as client:
            res = client.get(
                "https://graph.instagram.com/refresh_access_token",
                params={"grant_type": "ig_refresh_token", "access_token": account.access_token},
            )
            res.raise_for_status()
            payload = res.json()
    elif not account.refresh_token:
        return account.access_token
    else:
        payload = oauth.refresh("youtube" if account.platform == "youtube" else account.platform, account.refresh_token)
    account.access_token = payload["access_token"]
    account.refresh_token = payload.get("refresh_token") or account.refresh_token
    account.token_expires_at = oauth.expiry(payload)
    session.add(account)
    session.commit()
    return account.access_token


def publish(session: Session, account: SocialAccount, *, video_url: str, video_bytes, title: str, caption: str) -> str:
    token = fresh_token(session, account)
    fn = {"youtube": _youtube, "tiktok": _tiktok, "instagram": _instagram, "facebook": _facebook}[account.platform]
    return fn(account, token, video_url, video_bytes, title, caption)


def _raise(res: httpx.Response, what: str) -> None:
    if res.status_code >= 400:
        try:
            detail = res.json()
        except ValueError:
            detail = res.text[:300]
        raise RuntimeError(f"{what} error {res.status_code}: {detail}")


def _youtube(account, token, video_url, video_bytes, title, caption) -> str:
    meta = {
        "snippet": {"title": (title or "Clip")[:95], "description": caption or ""},
        "status": {"privacyStatus": "public", "selfDeclaredMadeForKids": False},
    }
    with httpx.Client(timeout=600) as client:
        init = client.post(
            "https://www.googleapis.com/upload/youtube/v3/videos",
            params={"uploadType": "resumable", "part": "snippet,status"},
            json=meta,
            headers={"Authorization": f"Bearer {token}", "X-Upload-Content-Type": "video/mp4"},
        )
        _raise(init, "YouTube")
        up = client.put(init.headers["location"], content=video_bytes(), headers={"Content-Type": "video/mp4"})
        _raise(up, "YouTube upload")
        return f"https://youtube.com/shorts/{up.json()['id']}"


def _tiktok(account, token, video_url, video_bytes, title, caption) -> str:
    data = video_bytes()
    headers = {"Authorization": f"Bearer {token}"}
    with httpx.Client(timeout=600) as client:
        init = client.post(
            "https://open.tiktokapis.com/v2/post/publish/video/init/",
            json={
                "post_info": {"title": (caption or title or "")[:2200], "privacy_level": "PUBLIC_TO_EVERYONE"},
                "source_info": {
                    "source": "FILE_UPLOAD",
                    "video_size": len(data),
                    "chunk_size": len(data),
                    "total_chunk_count": 1,
                },
            },
            headers=headers,
        )
        _raise(init, "TikTok")
        info = init.json()["data"]
        up = client.put(
            info["upload_url"],
            content=data,
            headers={"Content-Type": "video/mp4", "Content-Range": f"bytes 0-{len(data) - 1}/{len(data)}"},
        )
        _raise(up, "TikTok upload")
        for _ in range(60):  # TikTok posts asynchronously
            st = client.post(
                "https://open.tiktokapis.com/v2/post/publish/status/fetch/",
                json={"publish_id": info["publish_id"]},
                headers=headers,
            )
            status = (st.json().get("data") or {}).get("status")
            if status == "PUBLISH_COMPLETE":
                break
            if status in ("FAILED", "PUBLISH_FAILED"):
                raise RuntimeError(f"TikTok rejected the video: {st.json()}")
            time.sleep(5)
        # The Content Posting API doesn't return the video URL — link the profile.
        return f"https://www.tiktok.com/@{account.username}" if account.username else "https://www.tiktok.com"


def _instagram(account, token, video_url, video_bytes, title, caption) -> str:
    meta = account.meta or {}
    # standalone Instagram Login talks to graph.instagram.com; page-linked to graph.facebook.com
    graph = "https://graph.instagram.com/v19.0" if meta.get("ig_login") else oauth.GRAPH
    ig = meta.get("ig_user_id") or account.external_id
    with httpx.Client(timeout=60) as client:
        res = client.post(
            f"{graph}/{ig}/media",
            data={"media_type": "REELS", "video_url": video_url, "caption": caption or title or "", "access_token": token},
        )
        _raise(res, "Instagram")
        creation = res.json()["id"]
        for _ in range(60):  # IG pulls + processes the video before it can publish
            st = client.get(f"{graph}/{creation}", params={"fields": "status_code", "access_token": token})
            code = st.json().get("status_code")
            if code == "FINISHED":
                break
            if code == "ERROR":
                raise RuntimeError("Instagram could not process the video")
            time.sleep(5)
        pub = client.post(f"{graph}/{ig}/media_publish", data={"creation_id": creation, "access_token": token})
        _raise(pub, "Instagram publish")
        link = client.get(f"{graph}/{pub.json()['id']}", params={"fields": "permalink", "access_token": token})
        return link.json().get("permalink") or f"https://www.instagram.com/{account.username or ''}"


def _facebook(account, token, video_url, video_bytes, title, caption) -> str:
    page = (account.meta or {}).get("page_id") or account.external_id
    with httpx.Client(timeout=120) as client:
        res = client.post(
            f"{oauth.GRAPH}/{page}/videos",
            data={"file_url": video_url, "description": caption or title or "", "access_token": token},
        )
        _raise(res, "Facebook")
        return f"https://www.facebook.com/{res.json()['id']}"
