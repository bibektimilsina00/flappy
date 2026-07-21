.PHONY: setup infra migrate revision api worker beat web dev lint test clean

# ── One-time setup ──────────────────────────────────────────────────
setup:
	pnpm install
	uv sync

# ── Infra (postgres, redis, minio) ──────────────────────────────────
infra:
	docker compose -f deploy/docker-compose.yml up -d

# ── Database ────────────────────────────────────────────────────────
migrate:
	uv run alembic -c apps/api/alembic.ini upgrade head

revision:
	uv run alembic -c apps/api/alembic.ini revision --autogenerate -m "$(m)"

# ── Local dev (run each in its own terminal) ────────────────────────
# Import root is the repo root — everything is addressed as apps.api.app.*
api:
	uv run uvicorn apps.api.app.main:app --reload --port 8000

worker:
	uv run celery -A apps.worker.app.worker worker --loglevel=info

beat:
	uv run celery -A apps.api.app.core.celery beat --loglevel=info

web:
	pnpm --filter web dev

# All three services at once via turbo (needs a "dev" script per app)
dev:
	pnpm dev

# ── Utilities ───────────────────────────────────────────────────────
lint:
	uv run ruff check . --fix
	uv run ruff format .
	pnpm --filter web lint

test:
	uv run pytest apps/api

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .ruff_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
