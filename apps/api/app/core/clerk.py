"""Verify Clerk session JWTs and look up Clerk users, so the API trusts Clerk.

The frontend sends Clerk's session token as a Bearer token; we verify it against
Clerk's JWKS (RS256) and, on first sight, resolve the user's email via Clerk's
Backend API. Issuer + JWKS URL are derived from the publishable key.
"""

import base64
import time

import httpx
from jose import jwt

from apps.api.app.core.config import settings

_JWKS: dict | None = None
_JWKS_AT = 0.0
_JWKS_TTL = 3600.0


def _frontend_api() -> str:
    """Clerk frontend-API host (e.g. clerk.riocut.com), decoded from the pk."""
    pk = settings.clerk_publishable_key
    if not pk:
        return ""
    b64 = pk.split("_", 2)[-1]  # strip pk_live_ / pk_test_
    try:
        return base64.b64decode(b64 + "=" * (-len(b64) % 4)).decode().rstrip("$")
    except Exception:  # noqa: BLE001
        return ""


def _jwks(force: bool = False) -> dict:
    global _JWKS, _JWKS_AT
    if not force and _JWKS is not None and time.monotonic() - _JWKS_AT < _JWKS_TTL:
        return _JWKS
    host = _frontend_api()
    if not host:
        return {"keys": []}
    _JWKS = httpx.get(f"https://{host}/.well-known/jwks.json", timeout=10).json()
    _JWKS_AT = time.monotonic()
    return _JWKS


def verify_session_token(token: str) -> dict | None:
    """Verified Clerk claims, or None if `token` isn't a valid Clerk session JWT."""
    host = _frontend_api()
    if not host:
        return None
    try:
        kid = jwt.get_unverified_header(token).get("kid")
        key = next((k for k in _jwks().get("keys", []) if k.get("kid") == kid), None)
        if key is None:  # key may have rotated — refetch once
            key = next((k for k in _jwks(force=True).get("keys", []) if k.get("kid") == kid), None)
        if key is None:
            return None
        return jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            issuer=f"https://{host}",
            options={"verify_aud": False},
        )
    except Exception:  # noqa: BLE001 — any failure means "not a valid Clerk token"
        return None


def fetch_user(clerk_user_id: str) -> dict:
    """A Clerk user's {email, name, avatar_url} via the Backend API."""
    if not settings.clerk_secret_key:
        raise RuntimeError("CLERK_SECRET_KEY is not set")
    r = httpx.get(
        f"https://api.clerk.com/v1/users/{clerk_user_id}",
        headers={"Authorization": f"Bearer {settings.clerk_secret_key}"},
        timeout=15,
    )
    r.raise_for_status()
    u = r.json()
    emails = u.get("email_addresses") or []
    primary = u.get("primary_email_address_id")
    email = next((e.get("email_address") for e in emails if e.get("id") == primary), None)
    if email is None and emails:
        email = emails[0].get("email_address")
    name = " ".join(x for x in [u.get("first_name"), u.get("last_name")] if x)
    if not name:
        name = email.split("@")[0] if email else "User"
    return {"email": email, "name": name, "avatar_url": u.get("image_url")}
