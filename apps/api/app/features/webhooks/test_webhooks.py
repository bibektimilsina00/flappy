"""Self-check for Clerk (svix) webhook signature verification.
Run: pytest, or `python -m ...test_webhooks`."""

import base64
import hashlib
import hmac
import time

from apps.api.app.core.config import settings
from apps.api.app.features.webhooks import router as wh


def _sign(secret_b64: str, msg_id: str, ts: str, body: bytes) -> str:
    digest = hmac.new(
        base64.b64decode(secret_b64), f"{msg_id}.{ts}.".encode() + body, hashlib.sha256
    ).digest()
    return f"v1,{base64.b64encode(digest).decode()}"


def test_verify_accepts_valid_and_rejects_tampered(monkeypatch):
    raw_secret = base64.b64encode(b"super-secret-key").decode()
    monkeypatch.setattr(settings, "clerk_webhook_key", f"whsec_{raw_secret}")

    body = b'{"type":"user.created","data":{"id":"user_1"}}'
    msg_id = "msg_123"
    ts = str(int(time.time()))  # real "now" so the 5-min replay window passes
    sig = _sign(raw_secret, msg_id, ts, body)
    headers = {"svix-id": msg_id, "svix-timestamp": ts, "svix-signature": sig}

    assert wh._verify(body, headers) is True
    # tampered body → reject
    assert wh._verify(body + b" ", headers) is False
    # wrong signature → reject
    bad = {**headers, "svix-signature": "v1,AAAA"}
    assert wh._verify(body, bad) is False
    # missing headers → reject
    assert wh._verify(body, {}) is False


def test_verify_rejects_stale_timestamp(monkeypatch):
    raw_secret = base64.b64encode(b"super-secret-key").decode()
    monkeypatch.setattr(settings, "clerk_webhook_key", f"whsec_{raw_secret}")
    body = b"{}"
    msg_id, ts = "msg_1", "1000000000"  # year 2001 — outside the 5-min window
    sig = _sign(raw_secret, msg_id, ts, body)
    headers = {"svix-id": msg_id, "svix-timestamp": ts, "svix-signature": sig}
    assert wh._verify(body, headers) is False
