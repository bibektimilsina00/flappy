from celery import Celery

import apps.api.app.core.models_all  # noqa: F401 — register all mappers
from apps.api.app.core.config import settings

celery_app = Celery(
    "video",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["apps.worker.app.jobs.tasks"],
)
celery_app.conf.task_track_started = True
# Periodic maintenance (celery beat): sweep runs whose worker died mid-flight.
celery_app.conf.beat_schedule = {
    "cleanup-stuck": {"task": "cleanup_stuck", "schedule": 600.0},
    "promote-due-posts": {"task": "promote_due_posts", "schedule": 300.0},
    # Daily sweep; each free workspace gets topped up once per 30 days.
    "refill-free-credits": {"task": "refill_free_credits", "schedule": 86400.0},
}
