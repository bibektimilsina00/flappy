# syntax=docker/dockerfile:1
# One image for api, worker, and beat — same deps, different command.

FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim AS builder
ENV UV_LINK_MODE=copy UV_PYTHON_DOWNLOADS=0
WORKDIR /app
COPY pyproject.toml uv.lock ./
COPY apps/api/pyproject.toml apps/api/pyproject.toml
COPY apps/worker/pyproject.toml apps/worker/pyproject.toml
RUN --mount=type=cache,target=/root/.cache/uv uv sync --frozen --no-dev

FROM python:3.13-slim-bookworm
# libglib: opencv-headless runtime dep. ffmpeg itself ships inside the imageio-ffmpeg wheel.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd -m app
WORKDIR /app
ENV PATH="/app/.venv/bin:$PATH" PYTHONUNBUFFERED=1
COPY --from=builder --chown=app:app /app/.venv .venv
COPY --chown=app:app apps/api apps/api
COPY --chown=app:app apps/worker apps/worker
USER app
EXPOSE 8000
CMD ["uvicorn", "apps.api.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
