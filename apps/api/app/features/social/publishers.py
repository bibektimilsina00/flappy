"""Per-platform video publishing. Each publisher gets a fresh token, a
presigned video URL (for platforms that pull) and a bytes thunk (for platforms
that want an upload), and returns the URL of the published post. Runs inside
the Celery worker — blocking polls are fine here."""

from __future__ import annotations

import logging
import time
from datetime import UTC, datetime

import httpx
from sqlmodel import Session

from apps.api.app.features.social import oauth
from apps.api.app.features.social.models import SocialAccount

log = logging.getLogger(__name__)


def fresh_token(session: Session, account: SocialAccount) -> str:
    """Refresh a near-expiry token (google/tiktok/ig-login). Meta page tokens don't expire."""
    now = datetime.now(UTC).replace(tzinfo=None)
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
        payload = oauth.refresh(
            "youtube" if account.platform == "youtube" else account.platform, account.refresh_token
        )
    account.access_token = payload["access_token"]
    account.refresh_token = payload.get("refresh_token") or account.refresh_token
    account.token_expires_at = oauth.expiry(payload)
    session.add(account)
    session.commit()
    return account.access_token


def publish(
    session: Session,
    account: SocialAccount,
    *,
    video_url: str,
    video_bytes,
    title: str,
    caption: str,
    options: dict | None = None,
) -> str:
    token = fresh_token(session, account)
    if account.platform == "tiktok":
        return _tiktok(account, token, video_url, video_bytes, title, caption, options or {})
    fn = {
        "youtube": _youtube,
        "instagram": _instagram,
        "facebook": _facebook,
        "x": _x,
        "linkedin": _linkedin,
    }[account.platform]
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
        up = client.put(
            init.headers["location"], content=video_bytes(), headers={"Content-Type": "video/mp4"}
        )
        _raise(up, "YouTube upload")
        return f"https://youtube.com/shorts/{up.json()['id']}"


def tiktok_creator_info(token: str) -> dict:
    """Content Posting API requires querying creator_info before a direct post —
    it returns the privacy levels this creator/app may use and interaction flags."""
    with httpx.Client(timeout=30) as client:
        res = client.post(
            "https://open.tiktokapis.com/v2/post/publish/creator_info/query/",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json; charset=UTF-8",
            },
        )
        _raise(res, "TikTok creator info")
        return res.json().get("data") or {}


def _tiktok(account, token, video_url, video_bytes, title, caption, options) -> str:
    data = video_bytes()
    headers = {"Authorization": f"Bearer {token}"}
    info = tiktok_creator_info(token)
    # Only publish at a privacy level TikTok says this creator/app may use.
    # Unaudited apps get SELF_ONLY only; the user's choice is honored if allowed.
    allowed = info.get("privacy_level_options") or ["SELF_ONLY"]
    requested = options.get("privacy_level")
    privacy = requested if requested in allowed else allowed[0]
    with httpx.Client(timeout=600) as client:
        init = client.post(
            "https://open.tiktokapis.com/v2/post/publish/video/init/",
            json={
                "post_info": {
                    "title": (caption or title or "")[:2200],
                    "privacy_level": privacy,
                    "disable_comment": bool(info.get("comment_disabled")),
                    "disable_duet": bool(info.get("duet_disabled")),
                    "disable_stitch": bool(info.get("stitch_disabled")),
                },
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
            headers={
                "Content-Type": "video/mp4",
                "Content-Range": f"bytes 0-{len(data) - 1}/{len(data)}",
            },
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
        return (
            f"https://www.tiktok.com/@{account.username}"
            if account.username
            else "https://www.tiktok.com"
        )


def _instagram(account, token, video_url, video_bytes, title, caption) -> str:
    meta = account.meta or {}
    # standalone Instagram Login talks to graph.instagram.com; page-linked to graph.facebook.com
    graph = "https://graph.instagram.com/v19.0" if meta.get("ig_login") else oauth.GRAPH
    ig = meta.get("ig_user_id") or account.external_id
    with httpx.Client(timeout=60) as client:
        res = client.post(
            f"{graph}/{ig}/media",
            data={
                "media_type": "REELS",
                "video_url": video_url,
                "caption": caption or title or "",
                "access_token": token,
            },
        )
        _raise(res, "Instagram")
        creation = res.json()["id"]
        for _ in range(60):  # IG pulls + processes the video before it can publish
            st = client.get(
                f"{graph}/{creation}", params={"fields": "status_code", "access_token": token}
            )
            code = st.json().get("status_code")
            if code == "FINISHED":
                break
            if code == "ERROR":
                raise RuntimeError("Instagram could not process the video")
            time.sleep(5)
        pub = client.post(
            f"{graph}/{ig}/media_publish", data={"creation_id": creation, "access_token": token}
        )
        _raise(pub, "Instagram publish")
        link = client.get(
            f"{graph}/{pub.json()['id']}", params={"fields": "permalink", "access_token": token}
        )
        return link.json().get("permalink") or f"https://www.instagram.com/{account.username or ''}"


def _x(account, token, video_url, video_bytes, title, caption) -> str:
    """v2 chunked media upload (INIT/APPEND/FINALIZE/STATUS), then the tweet."""
    data = video_bytes()
    headers = {"Authorization": f"Bearer {token}"}
    upload = "https://api.x.com/2/media/upload"
    with httpx.Client(timeout=600) as client:
        init = client.post(
            upload,
            data={
                "command": "INIT",
                "total_bytes": len(data),
                "media_type": "video/mp4",
                "media_category": "tweet_video",
            },
            headers=headers,
        )
        _raise(init, "X upload init")
        j = init.json()
        media_id = (j.get("data") or {}).get("id") or j.get("media_id_string")
        chunk = 4 * 1024 * 1024
        for i in range(0, len(data), chunk):
            part = client.post(
                upload,
                data={"command": "APPEND", "media_id": media_id, "segment_index": i // chunk},
                files={"media": data[i : i + chunk]},
                headers=headers,
            )
            _raise(part, "X upload")
        fin = client.post(
            upload, data={"command": "FINALIZE", "media_id": media_id}, headers=headers
        )
        _raise(fin, "X upload finalize")
        info = ((fin.json().get("data") or fin.json()) or {}).get("processing_info")
        while info and info.get("state") in ("pending", "in_progress"):
            time.sleep(info.get("check_after_secs") or 3)
            st = client.get(
                upload, params={"command": "STATUS", "media_id": media_id}, headers=headers
            )
            info = ((st.json().get("data") or st.json()) or {}).get("processing_info")
        if info and info.get("state") == "failed":
            raise RuntimeError(f"X could not process the video: {info}")
        tweet = client.post(
            "https://api.x.com/2/tweets",
            json={"text": (caption or title or "")[:280], "media": {"media_ids": [str(media_id)]}},
            headers=headers,
        )
        _raise(tweet, "X post")
        return f"https://x.com/{account.username or 'i'}/status/{tweet.json()['data']['id']}"


def _linkedin(account, token, video_url, video_bytes, title, caption) -> str:
    """Assets API register-upload + PUT bytes, then a VIDEO ugcPost."""
    person = (account.meta or {}).get("person_urn") or f"urn:li:person:{account.external_id}"
    headers = {"Authorization": f"Bearer {token}", "X-Restli-Protocol-Version": "2.0.0"}
    with httpx.Client(timeout=600) as client:
        reg = client.post(
            "https://api.linkedin.com/v2/assets?action=registerUpload",
            json={
                "registerUploadRequest": {
                    "recipes": ["urn:li:digitalmediaRecipe:feedshare-video"],
                    "owner": person,
                    "serviceRelationships": [
                        {"relationshipType": "OWNER", "identifier": "urn:li:userGeneratedContent"}
                    ],
                }
            },
            headers=headers,
        )
        _raise(reg, "LinkedIn upload register")
        value = reg.json()["value"]
        upload_url = value["uploadMechanism"][
            "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
        ]["uploadUrl"]
        up = client.put(
            upload_url, content=video_bytes(), headers={"Authorization": f"Bearer {token}"}
        )
        _raise(up, "LinkedIn upload")
        post = client.post(
            "https://api.linkedin.com/v2/ugcPosts",
            json={
                "author": person,
                "lifecycleState": "PUBLISHED",
                "specificContent": {
                    "com.linkedin.ugc.ShareContent": {
                        "shareCommentary": {"text": caption or title or ""},
                        "shareMediaCategory": "VIDEO",
                        "media": [
                            {
                                "status": "READY",
                                "media": value["asset"],
                                "title": {"text": (title or "Clip")[:200]},
                            }
                        ],
                    }
                },
                "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"},
            },
            headers=headers,
        )
        _raise(post, "LinkedIn post")
        urn = post.headers.get("x-restli-id") or post.json().get("id")
        return f"https://www.linkedin.com/feed/update/{urn}"


def _facebook(account, token, video_url, video_bytes, title, caption) -> str:
    page = (account.meta or {}).get("page_id") or account.external_id
    with httpx.Client(timeout=120) as client:
        res = client.post(
            f"{oauth.GRAPH}/{page}/videos",
            data={
                "file_url": video_url,
                "description": caption or title or "",
                "access_token": token,
            },
        )
        _raise(res, "Facebook")
        return f"https://www.facebook.com/{res.json()['id']}"
