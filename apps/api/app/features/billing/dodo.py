"""Dodo Payments (merchant of record): checkout creation + webhook handling.

Flow: POST /billing/upgrade -> Dodo-hosted checkout -> Dodo webhooks back ->
workspace.plan flips and monthly Pro credits land. Signature verification
follows the Standard Webhooks spec (HMAC-SHA256 over "id.timestamp.body").
"""

import base64
import hashlib
import hmac
import logging
import time
import uuid

import httpx
from sqlmodel import Session

from apps.api.app.core.config import settings
from apps.api.app.core.redis import get_redis
from apps.api.app.features.billing import repository
from apps.api.app.features.users import repository as users_repo
from apps.api.app.features.users.models import User
from apps.api.app.features.workspaces import repository as workspaces_repo

log = logging.getLogger(__name__)

_BASE = {"test_mode": "https://test.dodopayments.com", "live_mode": "https://live.dodopayments.com"}


def _products() -> dict[str, str]:
    """tier -> Dodo product id (only tiers that are configured)."""
    return {
        tier: pid
        for tier, pid in {
            "plus": settings.dodo_product_plus,
            "pro": settings.dodo_product_pro,
            "ultra": settings.dodo_product_ultra,
        }.items()
        if pid
    }


def enabled() -> bool:
    return bool(settings.dodo_api_key and _products())


def create_checkout(user: User, workspace_id: uuid.UUID, tier: str) -> str:
    """Hosted checkout session for a paid tier; returns its URL."""
    product_id = _products().get(tier)
    if not product_id:
        raise ValueError(f"tier {tier} not configured")
    base = _BASE.get(settings.dodo_environment, _BASE["test_mode"])
    r = httpx.post(
        f"{base}/checkouts",
        headers={"Authorization": f"Bearer {settings.dodo_api_key}"},
        json={
            "product_cart": [{"product_id": product_id, "quantity": 1}],
            "customer": {"email": user.email, "name": user.name or user.email},
            "metadata": {"workspace_id": str(workspace_id), "tier": tier},
            "return_url": f"{settings.frontend_url}/settings?checkout=done",
        },
        timeout=20,
    )
    r.raise_for_status()
    return r.json()["checkout_url"]


def verify_signature(body: bytes, headers: dict[str, str]) -> bool:
    """Standard Webhooks: HMAC-SHA256 of "{id}.{ts}.{body}" with the base64
    secret; the signature header holds space-separated "v1,<base64>" entries."""
    msg_id = headers.get("webhook-id", "")
    ts = headers.get("webhook-timestamp", "")
    sig_header = headers.get("webhook-signature", "")
    if not (msg_id and ts and sig_header and settings.dodo_webhook_key):
        return False
    try:
        if abs(time.time() - int(ts)) > 300:  # 5 min replay window
            return False
        secret = settings.dodo_webhook_key
        secret = secret.split("_", 1)[1] if secret.startswith("whsec_") else secret
        expect = base64.b64encode(
            hmac.new(
                base64.b64decode(secret), f"{msg_id}.{ts}.".encode() + body, hashlib.sha256
            ).digest()
        ).decode()
    except Exception:
        return False
    return any(
        hmac.compare_digest(expect, part.split(",", 1)[1])
        for part in sig_header.split()
        if "," in part
    )


def _resolve_workspace(session: Session, data: dict) -> uuid.UUID | None:
    meta_ws = (data.get("metadata") or {}).get("workspace_id")
    if meta_ws:
        try:
            return uuid.UUID(meta_ws)
        except ValueError:
            pass
    email = (data.get("customer") or {}).get("email")
    if email:
        user = users_repo.get_by_email(session, email)
        if user:
            ws = workspaces_repo.get_by_owner(session, user.id)
            if ws:
                return ws.id
    return None


def handle_event(session: Session, event: dict, webhook_id: str) -> None:
    """Apply one verified webhook. Idempotent via a redis seen-set."""
    if webhook_id:
        try:
            if not get_redis().set(f"dodo:wh:{webhook_id}", 1, nx=True, ex=7 * 86400):
                return  # already processed (Dodo retries deliveries)
        except Exception:
            log.warning("redis unavailable for webhook dedupe; processing anyway")

    etype = event.get("type") or ""
    data = event.get("data") or {}
    ws_id = _resolve_workspace(session, data)
    if ws_id is None:
        log.warning("dodo webhook %s: no workspace resolvable", etype)
        return

    ws = workspaces_repo.get(session, ws_id)
    if ws is None:
        return
    if etype in ("subscription.active", "subscription.renewed"):
        from apps.api.app.features.billing.plans import monthly_credits

        # Tier from our checkout metadata; fall back to matching the product id.
        tier = (data.get("metadata") or {}).get("tier")
        if tier not in _products():
            pid = data.get("product_id") or ""
            tier = next((t for t, p in _products().items() if p == pid), "pro")
        ws.plan = tier
        session.add(ws)
        grant = monthly_credits(tier)
        repository.add_credits(session, ws_id, grant)
        session.commit()
        log.info("workspace %s -> %s (%s), +%s credits", ws_id, tier, etype, grant)
    elif etype in (
        "subscription.on_hold",
        "subscription.failed",
        "subscription.cancelled",
        "subscription.expired",
    ):
        ws.plan = "free"
        session.add(ws)
        session.commit()
        log.info("workspace %s -> free (%s)", ws_id, etype)
