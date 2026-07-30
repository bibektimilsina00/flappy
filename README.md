# Riocut

Node-based AI video generation. Monorepo — see [`arch.md`](./arch.md).

```text
apps/
├── api/      FastAPI backend  (uvicorn apps.api.app.main:app)
├── web/      Next.js app      (marketing + node editor)
└── worker/   Celery worker    (celery -A apps.worker.app.worker worker)
```

## Dev

```bash
# infra
docker compose -f deploy/docker-compose.yml up -d   # postgres, redis, minio

# backend (from repo root — import root is the repo root)
uv sync
uv run alembic -c apps/api/alembic.ini revision --autogenerate -m "init"
uv run alembic -c apps/api/alembic.ini upgrade head
uv run uvicorn apps.api.app.main:app --reload

# worker
uv run celery -A apps.worker.app.worker worker -l info

# frontend
pnpm install
pnpm --filter web dev
```

## Deploy

Push to `main` → GitHub Actions lints/tests, builds both images to GHCR
(`riocut/backend`, `riocut/web`), then SSHes into the VPS and rolls
`deploy/docker-compose.prod.yml` over (`pull` + `up -d`). Migrations run on
api start. Caddy is the single public port (80): `/api/*` → api,
`/video-assets/*` → MinIO presigned URLs, rest → web.

One-time setup:

1. On the VPS (as root): `curl -fsSL https://raw.githubusercontent.com/bibektimilsina00/riocut/main/scripts/vps-setup.sh | bash`
2. Repo secret `VPS_SSH_KEY` — a private key whose public half is in the VPS `~/.ssh/authorized_keys`.
3. Repo secret `ENV_FILE` — the full prod env (template: `deploy/env.prod.example`).
   Locally: keep it as `.env.prod` (gitignored) and push changes with `make env-push`;
   every deploy writes it to `/opt/riocut/.env`.

## Conventions

- **Imports:** everything is addressed from the repo root — `apps.api.app.*`.
- **Backend feature** = `models / schemas / repository / router / service`
  (see `apps/api/app/features/workflows` for the full pattern).
- **Nodes** = one class per file under `apps/api/app/node_system/nodes/`,
  registered by hand in `registry.py`.
- **SQLModel only** — table models `table=True`, schemas plain `SQLModel`.
- **Tenancy** — every owned row carries `workspace_id`; repositories filter by it.
