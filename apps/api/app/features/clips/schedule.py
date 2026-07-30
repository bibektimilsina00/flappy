"""Auto-schedule: turn a finished job's clips into a posting calendar.

Best clips first, N per day inside the user's posting window, in their
timezone. A beat task flips posts to "due" at their time; actual auto-posting
to platforms arrives with connected accounts (OAuth) — until then a due post
surfaces as "ready to post".
"""

from __future__ import annotations

from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo


def _hhmm(value: str, fallback: str) -> time:
    try:
        h, m = (value or fallback).split(":")
        return time(int(h) % 24, int(m) % 60)
    except (ValueError, AttributeError):
        h, m = fallback.split(":")
        return time(int(h), int(m))


def compute_schedule(
    clips: list[dict], cfg: dict, now: datetime | None = None
) -> list[tuple[dict, datetime]]:
    """[(clip, post_at_utc)] — highest score first, per_day slots per day spread
    evenly across the posting window."""
    try:
        tz = ZoneInfo(cfg.get("tz") or "UTC")
    except Exception:  # noqa: BLE001 — bad browser tz string
        tz = ZoneInfo("UTC")
    now = now or datetime.now(UTC)

    eligible = [c for c in clips if c.get("key")]
    min_score = cfg.get("min_score")
    if min_score:
        eligible = [c for c in eligible if (c.get("score") or 0) >= float(min_score)]
    eligible.sort(key=lambda c: -(c.get("score") or 0))

    per_day = max(1, min(10, int(cfg.get("per_day") or 3)))
    if cfg.get("mode") == "days":
        eligible = eligible[: per_day * max(1, min(60, int(cfg.get("days") or 7)))]

    try:
        start = (
            date.fromisoformat(cfg["start_date"])
            if cfg.get("start_date")
            else now.astimezone(tz).date()
        )
    except (ValueError, KeyError):
        start = now.astimezone(tz).date()

    ws = _hhmm(cfg.get("window_start") or "", "09:00")
    we = _hhmm(cfg.get("window_end") or "", "19:00")
    ws_min = ws.hour * 60 + ws.minute
    span = max(0, (we.hour * 60 + we.minute) - ws_min)

    out: list[tuple[dict, datetime]] = []
    for i, clip in enumerate(eligible):
        day_i, slot = divmod(i, per_day)
        minutes = ws_min + (span // 2 if per_day == 1 else span * slot // (per_day - 1))
        local = datetime.combine(
            start + timedelta(days=day_i), time(minutes // 60, minutes % 60), tzinfo=tz
        )
        out.append((clip, local.astimezone(UTC)))
    return out


def workspace_accounts(session, workspace_id, account_ids: list) -> list:
    """The workspace's SocialAccounts matching the ids (ignores stale/foreign ids)."""
    import uuid as _uuid

    from apps.api.app.features.social.models import SocialAccount

    out = []
    for raw in account_ids:
        try:
            aid = raw if isinstance(raw, _uuid.UUID) else _uuid.UUID(str(raw))
        except ValueError:
            continue
        account = session.get(SocialAccount, aid)
        if account and account.workspace_id == workspace_id:
            out.append(account)
    return out
