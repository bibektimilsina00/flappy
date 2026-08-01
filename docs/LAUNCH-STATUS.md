# Riocut — Launch Status & Remaining Work

_Last updated: 2026-07-31. The companion to this doc is the code itself — where
they disagree, the code wins; update this file._

## What's live at https://riocut.com

- **Infra**: DigitalOcean VPS (1 vCPU / 2 GB / 48 GB, 2 GB swap) · Docker Compose
  (postgres, redis, api, worker, beat, pot, web, caddy) · media on Cloudflare R2 (zero egress) · Caddy on 80/443
  with auto-HTTPS · push-to-main = deploy (GitHub Actions → GHCR → SSH rollover).
- **Secrets flow**: `.env.prod` (local, gitignored) → `make env-push` → `ENV_FILE`
  repo secret → written to `/opt/riocut/.env` on every deploy.
- **Clips pipeline**: upload or link → yt-dlp (direct-first, residential-proxy
  rescue) → faster-whisper (local) → LLM moment selection
  (`CLIPS_SELECT_MODEL=google/gemini-3.6-flash`) → ffmpeg render (Fit/Fill
  layouts, captions, titles, watermark) → zip/social publishing.
- **YouTube stack**: cookies (`/opt/riocut/ytdlp/cookies.txt`, rw) + PO-token
  sidecar (`pot`) + Deno/EJS solver + Webshare rotating residential proxy
  (`CLIPS_PROXY`). Direct-first: proxy GB is only spent on rescues, never for
  free-plan users.
- **Auth**: email/password + Google + Discord OAuth (prod redirect URIs set for
  Google only — see gaps).

## Pricing & plans (enforced server-side)

1 credit ≈ $0.01. Single source of truth: `apps/api/app/features/billing/plans.py`
(backend) and `apps/web/src/features/pricing/plans.ts` (frontend copy).

| Tier | $/mo | Credits/mo | Gets |
|---|---|---|---|
| Free | 0 | 100 top-up (+250 welcome) | uploads + non-YouTube links, 30-min sources, 720p + watermark, free models, no video gen |
| Plus | 12 | 1,200 | + YouTube import, video gen (standard models), 1-hour sources, 1080p, no watermark |
| Pro ⭐ | 28 | 3,200 | + premium models, 2-hour sources, auto-schedule & publishing |
| Ultra | 76 | 10,000 | + priority (NOT IMPLEMENTED — see gaps), early access |
| Studio S/M/L/XL/MAX | 140×(1/2/4/8/16) | 20k×(1/2/4/8/16) | volume tier, invoice/dedicated support |

Clips job cost: ingest 1 cr / 2 min of source (min 5) + selection 5 + 10 per
rendered clip. Canvas nodes: catalog-priced. Burns/edits/downloads free.
Monthly free refill: daily beat task tops free workspaces to 100 every 30 days.

## 🔴 Blockers to first revenue (user tasks)

1. **Dodo Payments dashboard** (test mode first):
   - Create 8 subscription products: Plus $12, Pro $28, Ultra $76,
     Studio S $140 / M $280 / L $560 / XL $1,120 / MAX $2,240 (all monthly).
   - Add webhook endpoint `https://riocut.com/api/v1/billing/webhook`
     (subscription + payment events).
   - Collect: API key, webhook signing secret (whsec_…), 8 product ids.
   - Fill in `.env.prod`: `DODO_API_KEY`, `DODO_WEBHOOK_KEY`,
     `DODO_ENVIRONMENT` (test_mode→live_mode), `DODO_PRODUCT_PLUS/PRO/ULTRA`,
     `DODO_PRODUCT_STUDIO_S/M/L/XL/MAX` → `make env-push` → redeploy.
   - Run one test-mode purchase end to end (Settings → Get Pro → test card →
     plan flips + credits land within ~2 min).
2. **Social publishing OAuth**: add `https://riocut.com/api/v1/social/...`
   redirect URIs in the TikTok / Instagram / Facebook consoles (currently dev
   URIs only); create X and LinkedIn apps (no prod keys at all yet); Google
   (YouTube) is done.

## 🟡 Promised-but-not-built (decide: build or soften copy)

- **Ultra "Highest generation priority"** — one Celery queue, no priority.
  Either implement priority queues (~a day: separate celery queue + worker
  `-Q` routing by plan) or remove the bullet from `plans.ts`.
- **Paid→paid tier switching** — not self-serve (would double-subscribe).
  Manual via Dodo dashboard/support for now. Build when the first Plus user
  wants Pro.

## 🟠 Untested in production

- **Video generation** end to end (gating works; an actual video-model run on
  prod has never been executed). Test once with a Pro/test workspace.
- **Dodo webhook against real deliveries** (signature code is self-tested;
  a live test-mode event has never hit the endpoint).
- **Free monthly refill** beat task (logic reviewed, first real 30-day tick
  hasn't happened).

## ⚙️ Operational notes / first upgrades when users arrive

- **VPS is the bottleneck**: transcription ≈ 20 min CPU per hour of video and
  blocks the single worker (concurrency=1). First paid upgrade: bigger droplet
  or a second worker VM. Whisper model is `CLIPS_WHISPER_MODEL=small`
  (`base` = ~2× faster, slightly worse Hindi/accented captions).
- **Proxy budget**: Webshare rotating residential, 1 GB @ $3.50/mo, auto-renew —
  watch Dashboard → Stats. Only YouTube rescues consume it (720p for free
  ingest… free users can't YouTube at all now, so: Plus+ only).
  When bills grow: source cache by video id (download trending videos once),
  or DataImpulse $1/GB via crypto-free payment route.
- **YouTube cookies** (`/opt/riocut/ytdlp/cookies.txt`): throwaway Google
  account, rotates in place. If ingest starts failing with bot-wall errors on
  *every* video, re-export fresh cookies (incognito → Get cookies.txt LOCALLY →
  scp) — don't log the account in anywhere else.
- **Daily spend cap**: `DAILY_SPEND_CAP_USD=0` (off). Set (e.g. 25) before
  opening video generation to strangers.
- **DB backups: nightly** — cron 03:15 on the VPS runs `/opt/riocut/backup.sh`
  (`pg_dump | gzip` -> R2 `backups/db-<date>.sql.gz`). Prune old ones someday.
- **Monitoring: none** beyond `docker compose logs`. Consider UptimeRobot on
  `/health` + a Slack/Discord webhook for failed jobs.

## Environment variable reference (prod)

Core: `DATABASE_URL` `REDIS_URL` `SECRET_KEY` `POSTGRES_PASSWORD`
`S3_ENDPOINT/BUCKET/ACCESS_KEY/SECRET_KEY` `API_BASE_URL` `FRONTEND_URL`
Clips: `CLIPS_SELECT_MODEL` `CLIPS_WHISPER_MODEL` `CLIPS_COOKIES_FILE`
`CLIPS_POT_PROVIDER_URL` `CLIPS_PROXY` `CLIPS_CREDITS_SELECT/PER_CLIP/PER_2MIN`
Billing: `FREE_MONTHLY_CREDITS` `DODO_*` (see blockers)
Providers: `GEMINI_API_KEY` `OPEN_ROUTER_API_KEY` `REPLICATE_API_KEY`
OAuth: `GOOGLE_*` `DISCORD_*` `TIKTOK_*` `FACEBOOK_*` `INSTAGRAM_*` `X_*` `LINKEDIN_*`

## Post-launch backlog (nice-to-have, in rough priority)

1. Priority queues for Ultra/Studio (or drop the claim).
2. Source cache by video id (proxy GB saver).
3. Credit top-up packs (one-time Dodo products) when someone runs dry mid-month.
4. Yearly billing (needs yearly Dodo products; the UI toggle was removed).
5. Streaming upload already done; consider tus/resumable for 2 GB files on bad connections.
6. Blog content for SEO (routes exist, no articles).
7. Real product screenshots to replace stock imagery in feature rows/showcase.
8. Upsell lock-card UI on the link input for free users (the 402 message works, a card converts better).
