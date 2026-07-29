"""Celery worker entrypoint. Run: celery -A app.worker.celery_app worker."""

from apps.api.app.core.celery import celery_app

# Import tasks so they register with the app.
from apps.worker.app.jobs import cleanup, clips, tasks  # noqa: F401,E402

__all__ = ["celery_app"]
