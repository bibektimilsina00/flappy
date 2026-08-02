"""Platform OAuth for publishing (not login). YouTube rides the existing
Google app (enable the YouTube Data API on it); TikTok and Meta have their own
keys. One Meta connect discovers Facebook pages AND their linked Instagram
business accounts."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode

import httpx

from apps.api.app.core.config import settings

GRAPH = "https://graph.facebook.com/v19.0"

PROVIDERS: dict[str, dict] = {
    "youtube": {
        "authorize_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "scope": "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly",
        "extra": {"access_type": "offline", "prompt": "consent"},
        "keys": ("google_client_id", "google_client_secret"),
    },
    "tiktok": {
        "authorize_url": "https://www.tiktok.com/v2/auth/authorize/",
        "token_url": "https://open.tiktokapis.com/v2/oauth/token/",
        "scope": "user.info.basic,video.publish",
        "extra": {},
        "keys": ("tiktok_client_key", "tiktok_client_secret"),
        "id_param": "client_key",  # TikTok's name for client_id
    },
    "instagram": {  # standalone "Instagram API with Instagram Login" — no page needed
        "authorize_url": "https://www.instagram.com/oauth/authorize",
        "token_url": "https://api.instagram.com/oauth/access_token",
        "scope": "instagram_business_basic,instagram_business_content_publish",
        "extra": {},
        "keys": ("instagram_app_id", "instagram_app_secret"),
    },
    "x": {
        "authorize_url": "https://x.com/i/oauth2/authorize",
        "token_url": "https://api.x.com/2/oauth2/token",
        "scope": "tweet.read tweet.write users.read media.write offline.access",
        "extra": {},
        "keys": ("x_client_id", "x_client_secret"),
        "pkce": True,  # X requires code_challenge; we use the plain method
        "basic_auth": True,  # confidential clients authenticate the token call via Basic
    },
    "linkedin": {
        "authorize_url": "https://www.linkedin.com/oauth/v2/authorization",
        "token_url": "https://www.linkedin.com/oauth/v2/accessToken",
        "scope": "openid profile w_member_social",
        "extra": {},
        "keys": ("linkedin_client_id", "linkedin_client_secret"),
    },
    "facebook": {
        "authorize_url": "https://www.facebook.com/v19.0/dialog/oauth",
        "token_url": f"{GRAPH}/oauth/access_token",
        "scope": "pages_show_list,pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish",
        "extra": {},
        "keys": ("facebook_app_id", "facebook_app_secret"),
    },
}
CONNECT_PLATFORMS = ("youtube", "tiktok", "instagram", "facebook", "x", "linkedin")


def creds(provider: str) -> tuple[str, str]:
    # TikTok sandbox app for pre-audit testing — separate key/secret, opt-in.
    if provider == "tiktok" and settings.tiktok_use_sandbox and settings.tiktok_sandbox_client_key:
        return settings.tiktok_sandbox_client_key, settings.tiktok_sandbox_client_secret
    kid, ksec = PROVIDERS[provider]["keys"]
    return getattr(settings, kid), getattr(settings, ksec)


def is_configured(provider: str) -> bool:
    return all(creds(provider))


def redirect_uri(provider: str) -> str:
    return f"{settings.api_base_url}/api/v1/social/{provider}/callback"


def authorize_url(provider: str, state: str, verifier: str | None = None) -> str:
    cfg = PROVIDERS[provider]
    params = {
        cfg.get("id_param", "client_id"): creds(provider)[0],
        "redirect_uri": redirect_uri(provider),
        "response_type": "code",
        "scope": cfg["scope"],
        "state": state,
        **cfg["extra"],
    }
    if cfg.get("pkce") and verifier:
        params.update({"code_challenge": verifier, "code_challenge_method": "plain"})
    return f"{cfg['authorize_url']}?{urlencode(params)}"


def _token_call(provider: str, data: dict) -> dict:
    cfg = PROVIDERS[provider]
    cid, csec = creds(provider)
    auth = (cid, csec) if cfg.get("basic_auth") else None
    data = {
        cfg.get("id_param", "client_id"): cid,
        **({} if auth else {"client_secret": csec}),
        **data,
    }
    with httpx.Client(timeout=20) as client:
        res = client.post(
            cfg["token_url"], data=data, auth=auth, headers={"Accept": "application/json"}
        )
        res.raise_for_status()
        return res.json()


def exchange(provider: str, code: str, verifier: str | None = None) -> dict:
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri(provider),
    }
    if PROVIDERS[provider].get("pkce") and verifier:
        data["code_verifier"] = verifier
    return _token_call(provider, data)


def refresh(provider: str, refresh_token: str) -> dict:
    return _token_call(provider, {"grant_type": "refresh_token", "refresh_token": refresh_token})


def expiry(payload: dict) -> datetime | None:
    if not payload.get("expires_in"):
        return None
    return datetime.now(UTC).replace(tzinfo=None) + timedelta(
        seconds=int(payload["expires_in"]) - 60
    )


def discover_accounts(provider: str, tokens: dict) -> list[dict]:
    """Token payload -> SocialAccount field dicts to upsert."""
    access = tokens["access_token"]
    base = {
        "access_token": access,
        "refresh_token": tokens.get("refresh_token"),
        "token_expires_at": expiry(tokens),
        "meta": {},
    }
    with httpx.Client(timeout=20) as client:
        if provider == "youtube":
            res = client.get(
                "https://www.googleapis.com/youtube/v3/channels",
                params={"part": "snippet", "mine": "true"},
                headers={"Authorization": f"Bearer {access}"},
            )
            res.raise_for_status()
            return [
                {
                    **base,
                    "platform": "youtube",
                    "external_id": ch["id"],
                    "username": (ch.get("snippet") or {}).get("title"),
                    "avatar_url": (
                        ((ch.get("snippet") or {}).get("thumbnails") or {}).get("default") or {}
                    ).get("url"),
                }
                for ch in res.json().get("items", [])
            ]

        if provider == "tiktok":
            res = client.get(
                "https://open.tiktokapis.com/v2/user/info/",
                params={"fields": "open_id,display_name,avatar_url"},
                headers={"Authorization": f"Bearer {access}"},
            )
            res.raise_for_status()
            user = (res.json().get("data") or {}).get("user") or {}
            open_id = user.get("open_id") or tokens.get("open_id")
            if not open_id:
                return []
            return [
                {
                    **base,
                    "platform": "tiktok",
                    "external_id": open_id,
                    "username": user.get("display_name"),
                    "avatar_url": user.get("avatar_url"),
                }
            ]

        if provider == "x":
            res = client.get(
                "https://api.x.com/2/users/me",
                params={"user.fields": "profile_image_url"},
                headers={"Authorization": f"Bearer {access}"},
            )
            res.raise_for_status()
            user = res.json().get("data") or {}
            if not user.get("id"):
                return []
            return [
                {
                    **base,
                    "platform": "x",
                    "external_id": user["id"],
                    "username": user.get("username"),
                    "avatar_url": user.get("profile_image_url"),
                }
            ]

        if provider == "linkedin":
            res = client.get(
                "https://api.linkedin.com/v2/userinfo",
                headers={"Authorization": f"Bearer {access}"},
            )
            res.raise_for_status()
            user = res.json()
            if not user.get("sub"):
                return []
            return [
                {
                    **base,
                    "platform": "linkedin",
                    "external_id": user["sub"],
                    "username": user.get("name"),
                    "avatar_url": user.get("picture"),
                    "meta": {"person_urn": f"urn:li:person:{user['sub']}"},
                }
            ]

        if provider == "instagram":
            # short-lived login token -> 60-day token, then who am I
            _, csec = creds("instagram")
            res = client.get(
                "https://graph.instagram.com/access_token",
                params={
                    "grant_type": "ig_exchange_token",
                    "client_secret": csec,
                    "access_token": access,
                },
            )
            res.raise_for_status()
            ll = res.json()
            me = client.get(
                "https://graph.instagram.com/v19.0/me",
                params={
                    "fields": "user_id,username,profile_picture_url",
                    "access_token": ll["access_token"],
                },
            )
            me.raise_for_status()
            user = me.json()
            ig_id = str(user.get("user_id") or tokens.get("user_id") or "")
            if not ig_id:
                return []
            return [
                {
                    "platform": "instagram",
                    "external_id": ig_id,
                    "username": user.get("username"),
                    "avatar_url": user.get("profile_picture_url"),
                    "access_token": ll["access_token"],
                    "refresh_token": None,
                    "token_expires_at": expiry(ll),
                    "meta": {"ig_login": True, "ig_user_id": ig_id},
                }
            ]

        # facebook: long-lived user token -> pages (page tokens then never expire) + IG accounts
        cid, csec = creds("facebook")
        res = client.get(
            f"{GRAPH}/oauth/access_token",
            params={
                "grant_type": "fb_exchange_token",
                "client_id": cid,
                "client_secret": csec,
                "fb_exchange_token": access,
            },
        )
        res.raise_for_status()
        user_token = res.json()["access_token"]
        res = client.get(
            f"{GRAPH}/me/accounts",
            params={
                "fields": "id,name,access_token,picture{url},instagram_business_account{id,username,profile_picture_url}",
                "access_token": user_token,
            },
        )
        res.raise_for_status()
        out: list[dict] = []
        for page in res.json().get("data", []):
            token_fields = {
                "access_token": page["access_token"],
                "refresh_token": None,
                "token_expires_at": None,
            }
            out.append(
                {
                    "platform": "facebook",
                    "external_id": page["id"],
                    "username": page.get("name"),
                    "avatar_url": ((page.get("picture") or {}).get("data") or {}).get("url"),
                    "meta": {"page_id": page["id"]},
                    **token_fields,
                }
            )
            ig = page.get("instagram_business_account")
            if ig:
                out.append(
                    {
                        "platform": "instagram",
                        "external_id": ig["id"],
                        "username": ig.get("username"),
                        "avatar_url": ig.get("profile_picture_url"),
                        "meta": {"ig_user_id": ig["id"], "page_id": page["id"]},
                        **token_fields,
                    }
                )
        return out
