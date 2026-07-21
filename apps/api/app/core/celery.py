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
