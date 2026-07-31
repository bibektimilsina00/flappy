"""The plan ladder — one place for tier names, credits, and per-tier limits."""

# Monthly credit grant per paid tier (webhook applies on activation + renewal).
# Studio scales S->MAX: credits and price double together ($140 base x 1/2/4/8/16).
MONTHLY_CREDITS = {
    "plus": 1200.0,
    "pro": 3200.0,
    "ultra": 10000.0,
    "studio_s": 20000.0,
    "studio_m": 40000.0,
    "studio_l": 80000.0,
    "studio_xl": 160000.0,
    "studio_max": 320000.0,
}

PAID_TIERS = tuple(MONTHLY_CREDITS)

# Max clips source length in minutes; anything not listed gets the top cap.
_SOURCE_LIMIT_MIN = {"free": 30, "plus": 60}


def monthly_credits(tier: str) -> float:
    return MONTHLY_CREDITS.get(tier, 0.0)


def source_limit_min(plan: str) -> int:
    return _SOURCE_LIMIT_MIN.get(plan, 120)


def allows_premium_models(plan: str) -> bool:
    """Premium (paid-provider) models: Pro, Ultra, and every Studio size."""
    return plan in PAID_TIERS and plan != "plus"
