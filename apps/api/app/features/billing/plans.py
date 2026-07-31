"""The plan ladder — one place for tier names, credits, and per-tier limits."""

PAID_TIERS = ("plus", "pro", "ultra")

# Monthly credit grant per paid tier (webhook applies on activation + renewal).
MONTHLY_CREDITS = {"plus": 1200.0, "pro": 3200.0, "ultra": 10000.0}

# Max clips source length in minutes; anything not listed gets the top cap.
_SOURCE_LIMIT_MIN = {"free": 30, "plus": 60}

# Tiers allowed to run premium (paid-provider) models and the priciest kinds.
PREMIUM_MODEL_TIERS = ("pro", "ultra")


def monthly_credits(tier: str) -> float:
    return MONTHLY_CREDITS.get(tier, 0.0)


def source_limit_min(plan: str) -> int:
    return _SOURCE_LIMIT_MIN.get(plan, 120)
