# Video Platform Architecture

Node-based AI video generation platform. Structure mirrors the `runmycrew`
monorepo conventions.

## Stack

- **Frontend:** Next.js 15 + React 19 + TypeScript (one app: marketing + editor)
- **Backend:** FastAPI + Python 3.13 (uv)
- **Worker:** Celery + Redis (separate deployable app)
- **Database:** PostgreSQL + **SQLModel** (Alembic migrations)
- **Storage:** S3-compatible object storage
- **UI:** shadcn/ui + Tailwind v4
- **Monorepo:** turbo + pnpm workspaces + uv

> **SQLModel only.** No raw SQLAlchemy models, no standalone Pydantic
> `BaseModel`. Table models are `SQLModel, table=True`; request/response schemas
> are plain `SQLModel` (no `table=True`). One model layer, no DTO duplication.

---

# Monorepo Layout

```text
video-platform/
├── apps/
│   ├── api/          # FastAPI backend
│   ├── web/          # Next.js app — marketing + editor + dashboard
│   └── worker/       # Celery worker (imports from api)
├── deploy/           # docker-compose, k8s, infra
├── scripts/
├── docs/
├── turbo.json
├── pnpm-workspace.yaml
├── pyproject.toml    # uv workspace
└── README.md
```

---

# Backend — `apps/api/app/`

```text
app/
├── api/
│   ├── router.py         # root aggregate router
│   └── v1/router.py      # versioned; includes every feature router
├── core/
│   ├── config.py         # settings (env)
│   ├── database.py       # engine + get_session dependency
│   ├── celery.py         # celery app config
│   ├── redis.py
│   ├── security.py       # auth, hashing, token, permission checks
│   ├── logger.py
│   ├── events.py         # internal event bus
│   ├── models.py         # shared base model / id + timestamp mixin
│   ├── service.py        # base service helpers
│   └── ws_auth.py        # websocket auth
├── features/             # domain features (see standard below)
├── execution_engine/     # graph execution — HTTP-independent
├── node_system/          # node plugins
├── storage/              # object storage (s3 / local behind a protocol)
├── middleware/           # logging, rate limit
├── alembic/              # migrations (versions/)
└── main.py
```

## Feature standard — `features/<name>/`

Every feature is the same 5 files (matches runmycrew exactly):

```text
workflows/
├── __init__.py
├── models.py       # SQLModel tables (table=True)
├── schemas.py      # SQLModel request/response (no table=True)
├── repository.py   # all DB queries for this feature
├── router.py       # FastAPI routes — thin, delegates to service
└── service.py      # business logic; calls repository
```

Add extra files **only when the feature needs them** (runmycrew does this
per-feature, not everywhere): `websocket.py`, `lookups.py`, `registry.py`,
`seeder.py`, `constants.py`, `exceptions.py`.

Features to build:

```text
features/
├── auth/
├── users/
├── workspaces/     # tenancy boundary — everything is scoped to a workspace
├── workflows/      # the node graph documents
├── executions/     # runs (+ websocket.py for live status)
├── assets/         # generated media references
├── templates/      # + registry.py, seeder.py, seeds/
├── nodes/          # node catalog exposed to the editor
├── billing/        # credits, usage, quota
├── dashboard/
└── settings/
```

---

# Execution Engine — `apps/api/app/execution_engine/`

HTTP-independent. Takes a workflow graph, runs it, emits events. Runs **inside
the worker**, never in the API process.

```text
execution_engine/
├── concurrency.py            # per-workspace run concurrency limits
├── engine/
│   ├── workflow_runner.py    # orchestrates a run: schedule + gather
│   ├── node_executor.py      # runs one node with retries + isolation
│   ├── graph.py              # parse JSON -> DAG, topo-sort, cycle detection
│   ├── property_resolver.py  # resolve node inputs from upstream outputs
│   ├── expression_engine.py  # {{ }} template / expression evaluation
│   └── event_emitter.py      # progress events -> ws + DB
└── scheduler/
    ├── cron.py               # scheduled runs
    └── cleanup.py            # orphaned-run / asset sweeper
```

**Execution semantics (specify these — they're the hard part, not the folders):**

1. **Validate** before running — reject cycles, dangling edges, type-mismatched
   connections.
2. **Schedule** in topological order; independent nodes run concurrently.
3. **Isolate** failures — a failed node fails only its downstream dependents;
   other branches continue.
4. **Retry** per-node with backoff; distinguish retryable (429/5xx/timeout) from
   fatal (bad input).
5. **Cache** outputs by `(node_type, input_hash)` — unchanged upstream reuses the
   result instead of paying for the AI call again.
6. **Partial re-run** — editing one node re-runs only it + downstream.
7. **Cancel** — runs are cancellable at node await points.

---

# Node System — `apps/api/app/node_system/`

Only a handful of nodes (image, video, text, audio, compose, upload). Skip
runmycrew's folder-per-node + manifest + dynamic-registry machinery — that
exists to manage 150+ integration nodes. One file per node, a plain dict
registry.

```text
node_system/
├── base.py         # Node ABC: metadata + async execute(inputs, ctx) -> result
├── context.py      # per-run ctx: inputs, secrets, storage, emit()
├── registry.py     # NODES = {type: NodeClass} — hand-written, ~10 lines
└── nodes/
    ├── text.py         # prompt / text transform
    ├── image.py        # image generation
    ├── video.py        # video generation
    ├── audio.py        # tts / audio generation
    ├── compose.py      # ffmpeg assembly
    └── upload.py       # push result to storage
```

A node is one class in one file: metadata (type, title, inputs, outputs) +
async `execute`. I/O schemas are **SQLModel** classes so validation matches the
API. Split a node into its own folder **only** if it ever grows helpers/assets —
not before. Provider credentials come from the central secret store, passed in
via `context`, not declared per-node.

---

# Providers — `apps/api/app/features/nodes/` or a dedicated integration folder

AI providers follow runmycrew's `integrations/` pattern — one folder per
provider, `client.py` + `service.py`, ship only what you call:

```text
integrations/
├── base/
│   ├── base_integration.py   # protocol: generate(), estimate_cost()
│   └── http_client.py
├── fal/
│   ├── client.py
│   └── service.py
├── replicate/
└── openai/
```

Add `anthropic/`, `gemini/`, `huggingface/` when a node actually calls them.
Every provider reports **estimated + actual cost** so billing can enforce quota.

---

# Worker — `apps/worker/app/`

Separate deployable that imports the engine + tasks from `apps/api`.

```text
worker/app/
├── worker.py         # celery app entrypoint + beat schedule
└── jobs/
    └── tasks.py      # run_workflow, render, upload, thumbnail, cleanup
```

Workers own everything long-running: graph execution, AI inference, FFmpeg,
uploads. Tasks must be **idempotent** — a re-delivered task must not double-charge
or double-write.

---

# Storage — `apps/api/app/storage/`

```text
storage/
├── base.py       # Storage protocol: put / get / url / delete
├── s3.py
└── local.py      # dev fallback
```

Uploads, downloads, thumbnails, cleanup are **functions** on the protocol — not
separate modules.

---

# Frontend — `apps/web/`

One Next.js app. Marketing pages render static/SSR (SEO); the editor and
dashboard are a client-side route group. Keeps runmycrew's `features/` +
`shared/` split under `src/`.

```text
web/src/
├── app/
│   ├── (marketing)/      # landing, pricing, blog — static/SSR, SEO
│   ├── (app)/            # dashboard, editor, runs — auth-gated, client
│   │   └── editor/       # React Flow canvas ("use client")
│   ├── api/              # route handlers if any (auth callbacks)
│   ├── layout.tsx
│   └── globals.css
├── components/
│   └── ui/               # shadcn primitives ONLY
├── features/             # one folder per domain (standard below)
├── shared/
│   ├── components/       # cross-feature app components
│   ├── hooks/
│   ├── layouts/
│   ├── constants/
│   └── utils/
├── stores/               # global Zustand stores
└── lib/                  # cn.ts, query client, api client
```

`app/` holds routing + page shells only; real code lives in `features/`. The
React Flow editor is a `"use client"` route — no SSR benefit, but it ships in
the same app as the marketing pages.

## Feature standard — `features/<name>/`

Matches runmycrew exactly:

```text
workflows/
├── components/
├── hooks/
├── pages/            # route-level screens
├── services/         # TanStack Query hooks (api calls)
├── store/            # feature-local Zustand
├── types/
└── index.ts          # public surface of the feature
```

Features: `auth`, `dashboard`, `workflows`, `workflow-editor` (React Flow
canvas), `runs`, `assets`, `templates`, `billing`, `settings`.

**Stack:** Vite, React 19, TypeScript, Tailwind v4, shadcn/ui, React Flow,
Zustand, TanStack Query, React Hook Form, Zod, Sonner, Lucide.

---

# Cross-Cutting Concerns

### Tenancy (matches runmycrew `workspaces`)
Everything owned is scoped to a **workspace**. Every owned row (`workflow`,
`execution`, `asset`, `template`) carries `workspace_id`. Repositories filter by
it — never the caller. Enforce in `service.py` + `api/deps`.

### Billing, Quota & Cost Control
AI calls cost money — enforce **before** dispatch. `billing` tracks credits;
the engine checks remaining quota before scheduling a paid node and records
actual cost on completion. Per-workspace run rate limits via Redis token bucket
(`middleware/rate_limit.py`).

### Realtime
Websocket per `execution_id`; `event_emitter` publishes run/node status.
`executions/websocket.py` on the API side, authed via `core/ws_auth.py`.

### Migrations
Alembic in `apps/api/alembic/`, one revision per schema change. Models are
SQLModel; autogenerate reads them directly.

---

# Design Principles

1. Monorepo: `apps/{api,web,worker}`; web is one Next app (marketing + editor).
2. Organize backend + frontend by **feature**, uniform file layout per feature.
3. Execution engine independent of HTTP; runs in the worker only.
4. Every node is a self-contained plugin folder (`manifest` + `_node`).
5. AI inference and long jobs run in background workers only.
6. Media in object storage; only references in PostgreSQL.
7. **SQLModel is the single model layer** — no parallel DTO/ORM duplication.
8. Enforce tenancy and cost limits in services/repositories, not at call sites.
