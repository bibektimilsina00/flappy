import redis
import redis.asyncio as aioredis

from apps.api.app.core.config import settings


def get_redis() -> redis.Redis:
    """Sync client — used by the worker/engine to publish events."""
    return redis.Redis.from_url(settings.redis_url, decode_responses=True)


def get_async_redis() -> aioredis.Redis:
    """Async client — used by the API websocket to subscribe."""
    return aioredis.from_url(settings.redis_url, decode_responses=True)
