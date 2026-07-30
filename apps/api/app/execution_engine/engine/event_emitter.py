"""Run/node events -> Redis pub/sub (realtime) + a replay list (reconnects)."""

import json
import uuid
from datetime import UTC, datetime
from typing import Any

import redis

LOG_TTL_SECONDS = 60 * 60 * 24  # keep the replay buffer for a day


class EventEmitter:
    def __init__(self, execution_id: uuid.UUID | str, redis_client: redis.Redis) -> None:
        self.execution_id = str(execution_id)
        self.redis = redis_client
        self.channel = f"exec:{self.execution_id}"
        self.log_key = f"exec:{self.execution_id}:log"

    def emit(
        self,
        event: str,
        node_id: str | None = None,
        message: str | None = None,
        data: dict[str, Any] | None = None,
    ) -> None:
        payload = json.dumps(
            {
                "event": event,
                "node_id": node_id,
                "message": message,
                "data": data or {},
                "ts": datetime.now(UTC).isoformat(),
            }
        )
        # Publish for live subscribers, and append for late joiners to replay.
        self.redis.publish(self.channel, payload)
        self.redis.rpush(self.log_key, payload)
        self.redis.expire(self.log_key, LOG_TTL_SECONDS)
