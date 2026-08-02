"""Connect/disconnect social accounts. The OAuth callback lands from the
browser without our auth header, so a signed state token carries the
workspace id. Connect opens in a popup; the callback page pings the opener."""

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from sqlmodel import Session, select

from apps.api.app.api.deps import current_workspace_id, get_current_user, get_session
from apps.api.app.core.security import create_access_token, decode_token
from apps.api.app.features.social import oauth
from apps.api.app.features.social.models import SocialAccount
from apps.api.app.features.users.models import User

log = logging.getLogger(__name__)
router = APIRouter(prefix="/social", tags=["social"])

_POPUP_HTML = """<!doctype html><meta charset="utf-8"><title>Riocut</title>
<body style="background:#111;color:#eee;font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0">
<p>__MSG__</p>
<script>if(window.opener){window.opener.postMessage("riocut:social-connected","*")}setTimeout(()=>window.close(),1500)</script>
"""


def _popup(msg: str) -> HTMLResponse:
    return HTMLResponse(_POPUP_HTML.replace("__MSG__", msg))


def _out(a: SocialAccount) -> dict:
    return {
        "id": str(a.id),
        "platform": a.platform,
        "username": a.username,
        "avatar_url": a.avatar_url,
    }


@router.get("/providers")
def providers(_user: User = Depends(get_current_user)) -> dict:
    """Which connect flows have app credentials configured (honest UI state)."""
    return {p: oauth.is_configured(p) for p in oauth.CONNECT_PLATFORMS}


@router.get("/accounts")
def list_accounts(
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> list[dict]:
    accounts = session.exec(
        select(SocialAccount)
        .where(SocialAccount.workspace_id == workspace_id)
        .order_by(SocialAccount.platform)
    ).all()
    return [_out(a) for a in accounts]


@router.get("/{platform}/connect")
def connect(
    platform: str,
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    if platform not in oauth.CONNECT_PLATFORMS:
        raise HTTPException(status_code=404, detail="Unknown platform")
    if not oauth.is_configured(platform):
        raise HTTPException(
            status_code=400, detail="This platform's app is still awaiting approval."
        )
    verifier = uuid.uuid4().hex if oauth.PROVIDERS[platform].get("pkce") else ""
    state = create_access_token(f"social:{platform}:{workspace_id}:{verifier}")
    return {"url": oauth.authorize_url(platform, state, verifier or None)}


@router.get("/{platform}/callback")
def callback(
    platform: str,
    code: str | None = None,
    state: str = "",
    error: str | None = None,
    session: Session = Depends(get_session),
) -> HTMLResponse:
    parts = (decode_token(state) or "").split(":")
    if (
        error
        or not code
        or len(parts) not in (3, 4)
        or parts[0] != "social"
        or parts[1] != platform
    ):
        return _popup("Connection failed — you can close this window.")
    workspace_id = uuid.UUID(parts[2])
    verifier = parts[3] if len(parts) == 4 and parts[3] else None
    try:
        found = oauth.discover_accounts(platform, oauth.exchange(platform, code, verifier))
    except Exception:
        log.exception("social connect failed for %s", platform)
        return _popup("Connection failed — the platform rejected the request.")
    for acc in found:
        existing = session.exec(
            select(SocialAccount).where(
                SocialAccount.workspace_id == workspace_id,
                SocialAccount.platform == acc["platform"],
                SocialAccount.external_id == acc["external_id"],
            )
        ).first()
        if existing:
            for k, v in acc.items():
                setattr(existing, k, v)
            session.add(existing)
        else:
            session.add(SocialAccount(workspace_id=workspace_id, **acc))
    session.commit()
    if not found:
        return _popup("No publishable account found — for Meta, the login needs a Facebook page.")
    return _popup(
        f"Connected {len(found)} account{'s' if len(found) != 1 else ''}! You can close this window."
    )


@router.delete("/accounts/{account_id}", status_code=204)
def disconnect(
    account_id: uuid.UUID,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> None:
    account = session.get(SocialAccount, account_id)
    if account is None or account.workspace_id != workspace_id:
        raise HTTPException(status_code=404, detail="Account not found")
    session.delete(account)
    session.commit()


@router.get("/accounts/{account_id}/tiktok/creator-info")
def tiktok_creator_info(
    account_id: uuid.UUID,
    session: Session = Depends(get_session),
    workspace_id: uuid.UUID = Depends(current_workspace_id),
    _user: User = Depends(get_current_user),
) -> dict:
    """Privacy levels + interaction flags TikTok allows for this creator/app.
    The publish UI uses this to offer only the privacy options TikTok permits
    (unaudited apps get SELF_ONLY only)."""
    from apps.api.app.features.social import publishers

    account = session.get(SocialAccount, account_id)
    if account is None or account.workspace_id != workspace_id or account.platform != "tiktok":
        raise HTTPException(status_code=404, detail="TikTok account not found")
    try:
        info = publishers.tiktok_creator_info(publishers.fresh_token(session, account))
    except Exception as exc:  # noqa: BLE001 — surface a friendly message to the panel
        raise HTTPException(
            status_code=502, detail="Couldn't reach TikTok — try reconnecting the account."
        ) from exc
    return {
        "privacy_level_options": info.get("privacy_level_options") or ["SELF_ONLY"],
        "comment_disabled": bool(info.get("comment_disabled")),
        "duet_disabled": bool(info.get("duet_disabled")),
        "stitch_disabled": bool(info.get("stitch_disabled")),
        "max_video_post_duration_sec": info.get("max_video_post_duration_sec"),
    }
