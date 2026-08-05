"""User-login OAuth (Google, Discord). Standard authorization-code flow."""

from urllib.parse import urlencode

import httpx

from apps.api.app.core.config import settings

PROVIDERS = {
    "google": {
        "authorize_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "userinfo_url": "https://www.googleapis.com/oauth2/v2/userinfo",
        "scope": "openid email profile",
        "extra": {"access_type": "offline", "prompt": "consent"},
        "name_field": "name",
    },
    "discord": {
        "authorize_url": "https://discord.com/oauth2/authorize",
        "token_url": "https://discord.com/api/oauth2/token",
        "userinfo_url": "https://discord.com/api/users/@me",
        "scope": "identify email",
        "extra": {},
        "name_field": "global_name",
    },
}


def _client_id(provider: str) -> str:
    return getattr(settings, f"{provider}_client_id")


def _client_secret(provider: str) -> str:
    return getattr(settings, f"{provider}_client_secret")


def is_configured(provider: str) -> bool:
    return bool(_client_id(provider) and _client_secret(provider))


def redirect_uri(provider: str) -> str:
    return f"{settings.api_base_url}/api/v1/auth/oauth/{provider}/callback"


def authorize_url(provider: str, state: str) -> str:
    cfg = PROVIDERS[provider]
    params = {
        "client_id": _client_id(provider),
        "redirect_uri": redirect_uri(provider),
        "response_type": "code",
        "scope": cfg["scope"],
        "state": state,
        **cfg["extra"],
    }
    return f"{cfg['authorize_url']}?{urlencode(params)}"


def exchange(provider: str, code: str) -> dict:
    """Exchange the code for a token, then fetch userinfo -> {email, name}."""
    cfg = PROVIDERS[provider]
    with httpx.Client(timeout=15) as client:
        token_res = client.post(
            cfg["token_url"],
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri(provider),
                "client_id": _client_id(provider),
                "client_secret": _client_secret(provider),
            },
            headers={"Accept": "application/json"},
        )
        token_res.raise_for_status()
        access_token = token_res.json()["access_token"]

        info_res = client.get(
            cfg["userinfo_url"], headers={"Authorization": f"Bearer {access_token}"}
        )
        info_res.raise_for_status()
        info = info_res.json()

    email = info.get("email")
    name = (
        info.get(cfg["name_field"])
        or info.get("username")
        or (email.split("@")[0] if email else "User")
    )
    avatar_url = (
        info.get("picture")
        or info.get("avatar_url")
        or info.get("avatar")
    )
    return {"email": email, "name": name, "avatar_url": avatar_url}
