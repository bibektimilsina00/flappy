"""Clerk webhooks (Standard Webhooks / svix spec).

Currently just `user.created` -> a server-side `user_registered` PostHog event,
so signups show up as a discrete funnel step. The browser only fires `identify`
on sign-in, never a registration event, so this is the one reliable signal of a
brand-new account (keyed on the Clerk user id, so it merges with the client
person).
"""

import base64
import hashlib
import hmac
import json
import time

from fastapi import APIRouter, HTTPException, Request

from apps.api.app.core import analytics
from apps.api.app.core.config import settings

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


def _verify(body: bytes, headers: dict[str, str]) -> bool:
    """svix: HMAC-SHA256 of "{id}.{ts}.{body}" with the base64 whsec_ secret;
    the signature header holds space-separated "v1,<base64>" entries."""
    msg_id = headers.get("svix-id", "")
    ts = headers.get("svix-timestamp", "")
    sig_header = headers.get("svix-signature", "")
    if not (msg_id and ts and sig_header and settings.clerk_webhook_key):
        return False
    try:
        if abs(time.time() - int(ts)) > 300:  # 5-min replay window
            return False
        secret = settings.clerk_webhook_key
        secret = secret.split("_", 1)[1] if secret.startswith("whsec_") else secret
        expected = base64.b64encode(
            hmac.new(
                base64.b64decode(secret), f"{msg_id}.{ts}.".encode() + body, hashlib.sha256
            ).digest()
        ).decode()
    except Exception:
        return False
    return any(
        hmac.compare_digest(expected, part.split(",", 1)[1])
        for part in sig_header.split()
        if "," in part
    )


@router.post("/clerk")
async def clerk_webhook(request: Request) -> dict:
    """Signature-verified Clerk events. `user.created` -> `user_registered`."""
    body = await request.body()
    headers = {k.lower(): v for k, v in request.headers.items()}
    if not _verify(body, headers):
        raise HTTPException(status_code=401, detail="Invalid signature")

    event = json.loads(body)
    if event.get("type") == "user.created":
        data = event.get("data") or {}
        user_id = data.get("id")
        emails = data.get("email_addresses") or []
        email = emails[0].get("email_address") if emails else None
        analytics.capture(
            user_id,
            "user_registered",
            {"$set": {"email": email}, "signup_source": "clerk"},
        )
    return {"received": True}
