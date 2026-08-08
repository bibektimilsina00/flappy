"""Fire-and-forget server-side PostHog capture.

Analytics must never break a request, so every failure is swallowed and logged,
not raised. Uses the same project token as the web client, keyed on the Clerk
user id so server events merge with the browser's `identify`.
"""

import logging

import httpx

from apps.api.app.core.config import settings

log = logging.getLogger(__name__)


def capture(distinct_id: str, event: str, properties: dict | None = None) -> None:
    """Send one event to PostHog. No-op if PostHog isn't configured."""
    if not (settings.posthog_key and distinct_id):
        return
    try:
        httpx.post(
            f"{settings.posthog_host.rstrip('/')}/capture/",
            json={
                "api_key": settings.posthog_key,
                "event": event,
                "distinct_id": distinct_id,
                "properties": properties or {},
            },
            timeout=5,
        )
    except Exception:  # noqa: BLE001 — analytics is best-effort, never fatal
        log.warning("posthog capture failed for event %s", event, exc_info=True)
