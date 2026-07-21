# Generation Providers — Strategy & Implementation Plan

_Last updated 2026-07-21. Pricing figures are approximate (early-2026) — verify against each provider's current rate card before relying on them._

---

## 1. Decision (TL;DR)

| Concern | Choice |
|---|---|
| **Text** | **OpenRouter** — one key, 300+ LLMs, dynamic `/models`, cheapest path |
| **Image + Video + Audio** | **Replicate** — one topup, every modality, **self-describing schemas** |
| **Safety net** | **Cost guardrail** (balance floor + est-cost gate + daily cap) — build first |
| **Defaults** | **Cheap models default, premium opt-in** — video is the only expensive modality |
| Keep optional | Direct **Gemini** (Nano Banana) + **OpenAI** (GPT-Image) for a couple of flagships |

Two balances to watch (OpenRouter + Replicate), behind the vendor-agnostic adapter layer we already have.

**Why Replicate over Novita/others:** it's the only single platform that gives all modalities **and** fixes what killed Novita — every model exposes an input JSON schema, so the catalog *and* the settings panel generate themselves. No more hand-wiring 38 models and probing bodies.

---

## 2. The cost picture (this drives everything)

| Modality | Typical cost / generation | Reality |
|---|---|---|
| Text | fractions of a cent | ~$0.15–0.60 per **million** tokens. Negligible. |
| Audio (TTS) | ~$0.01–0.02/min (OpenAI) → $0.10–0.30/min (ElevenLabs) | Cheap. |
| Image | ~$0.02–0.06 | Flux ~$0.025–0.05, gpt-image (med) ~$0.04, Imagen ~$0.04. |
| **Video** | **$0.10 → $6+** | Wan ~$0.10–0.20/clip; Kling ~$0.35/5s; **Veo 3 ~$0.40–0.75/sec** (8s ≈ $3–6); Sora similar. |

**Everything except video is cents. Video is 10–100× everything else — it is the only real cost.** A $10 balance is ~30 video clips or ~200 images or ~30,000 text calls. Every design decision below is really about controlling the video row.

---

## 3. Architecture (the vendor-agnostic core — keep this)

The adapter layer is the asset. Providers are swappable behind it.

```
node.data ─▶ resolve_model ─▶ get_adapter ─▶ adapter.generate(model, request, ctx)
                                               │
                                   submit ▶ (poll) ▶ download ▶ ctx.storage.put ▶ key
                                               │
                              ctx.charge · ctx.on_asset · emit events (WS)
```

- **`ModelSpec`** — `id, name, kind, provider (icon only), cost, family, mode, params, config`.
- **`Adapter`** — `estimate_cost`, `generate`. Handles sync/async and image-input internally.
- **`config`** is provider-specific (endpoint/path/schema); never exposed to the UI. `provider` is the **maker** for the icon — the inference host is never surfaced.
- **Durable output**: adapters store the stable object **key**; URLs are presigned on demand (survives refresh + cross-device).

### Dynamic catalog (the big win, elaborated)
- **OpenRouter text**: fetch `GET /api/v1/models` at boot (cached) → build text `ModelSpec`s. New models appear automatically. Group by maker for the UI (already built).
- **Replicate media**: fetch `GET /v1/models` + per-model `openapi_schema` → map schema `properties` → `ParamSpec` (enum→select, number→grid, boolean→toggle) **automatically**. Use **collections** (`text-to-image`, `text-to-video`, `image-to-video`, `text-to-speech`) to slot models into node kinds. **This replaces hand-authored param profiles.**
- **Curation layer** (don't skip): dynamic lists include junk (we saw Novita's `ai_infer_test_*`). Keep an **allowlist / featured set** per kind so users see a curated list, with "show all" as an opt-in. Filter by: has display name, is active, not NSFW-only.

---

## 4. Cost & billing (build this properly)

### 4a. Cost guardrail — **build first, $0 to build**
Current state: the engine checks `has_credits(cost)` per node and fails mid-run with "Insufficient credits." Gaps to close:
1. **Pre-dispatch estimate gate** — at execution creation, sum the estimated cost of the node(s) to run; **reject before dispatch** if `estimated > balance`, with a clear message (don't start a run you can't finish).
2. **Per-workspace spend cap** — daily/monthly ceiling; block when exceeded.
3. **Estimated-cost surfaced in the UI** — show the credit cost on the send button / node before running an expensive video.
4. **Hard stop, not advisory** — once the cap/floor is hit, dispatch is refused.

### 4b. Pass-through pricing (you're a product, not the end user)
- You already have a **credits system** (workspace credits + usage records). Price 1 credit to cover **provider cost × margin** (e.g. 1.3–2×).
- Map each `ModelSpec.cost` (credits) to real provider $ so credits ≈ COGS + margin. Keep a small table: model → provider $ → credits.
- Users fund the video bill, not you. Free tier = small credit grant.

### 4c. Cheap defaults
- Default **video** node → a **cheap** model (Wan / Kling-turbo, ~$0.10–0.35), never Veo/Sora.
- Default image → Flux/Nano-Banana (~$0.03). Default text → a mini model. Default TTS → mini.
- Premium (Veo, Sora, Imagen-Ultra, ElevenLabs) = deliberate opt-in.

### 4d. Cost observability (the thing that would've caught the $10 burn)
- **Log actual provider cost per generation** in `usage_records` (not just credits).
- A simple **spend dashboard** + **alert** at e.g. 80% of a daily cap.
- This is cheap and pays for itself the first time someone loops a video node.

---

## 5. Gaps to address (things touched-but-thin, or missed)

These aren't blockers for the first cut, but they're real and belong on the roadmap.

1. **Production storage + public URL (blocks image-to-video).** Assets live in **MinIO on `localhost:9000`** in dev — providers can't fetch that for i2v/reference. Prod needs **S3 (or public MinIO) with a public endpoint** (`S3_PUBLIC_URL`). Until then, i2v/reference/edit models won't work end-to-end. Also add a **CDN** in front for serving generated media to users.
2. **Webhooks over poll-in-worker (video scale).** Today a video run **holds a Celery worker thread for 2–8 minutes** polling. Replicate/Fal support **webhooks** — submit, release the worker, resume on callback. Move video to a **webhook-completion** flow + a **dedicated video queue** with a concurrency cap, so a burst of video jobs can't starve text/image.
3. **Rate limits, retries, idempotency.** Add backoff on 429/5xx, bounded retries, and idempotency keys so a retried submit doesn't double-charge. (We hit raw 429s with no handling.)
4. **Content moderation / safety.** User prompts → provider moderation; handle NSFW/blocked results gracefully; log for ToS. Non-optional for a public product.
5. **Error UX / node failure states.** Clear per-node states for: insufficient credits, provider error, timeout, moderation block. The node should show *why* it failed, not just "failed."
6. **Testing without burning credits (hard lesson).** Verify adapters via: free **listing/schema** endpoints, **empty-body 400 probes** (validate shape at $0), and **dry-run body construction** (build+print the JSON, don't POST). **At most one** cheap real generation per modality to confirm, and it must **store** the result. Never fire-and-discard.
7. **Multi-provider routing/failover.** Since the adapter layer is provider-agnostic, later you can route a model to the cheapest/available backend and fail over if one is down or out of credits.
8. **Secrets management.** Per-provider keys in `.env` (gitignored); plan for rotation and per-environment keys before deploy.
9. **Model catalog freshness vs stability.** Dynamic lists change under you; pin a **curated featured set** so the default UX is stable, refresh the long tail on a schedule.

---

## 6. Rollout plan (ordered)

1. **Cost guardrail** — pre-dispatch estimate gate + balance floor + daily cap. _($0, do first.)_
2. **OpenRouter text adapter** — dynamic from `/models`, OpenAI-compatible. _(cheap to run.)_
3. **Replicate adapter** — create→poll→download→store; **schema→ParamSpec** mapper; collections→kinds; curation allowlist. _(build/verify listing at $0.)_
4. **Cheap per-node defaults.**
5. **Prod storage + public URL** (unblocks i2v).
6. **Webhooks + dedicated video queue** (scale).
7. **Cost observability + alerts.**
8. Moderation, retries, failover (hardening).

---

## 7. Config / env needed

```
OPEN_ROUTER_API_KEY=sk-or-...        # text (have it)
REPLICATE_API_TOKEN=r8_...           # image/video/audio (to add)
GEMINI_API_KEY=...                   # optional flagships (have it; depleted)
OPENAI_API_KEY=sk-...                # optional flagships (to add if used)
# Prod storage:
S3_ENDPOINT / S3_PUBLIC_URL / S3_BUCKET / S3_ACCESS_KEY / S3_SECRET_KEY
```

Current adapters keyed by these already exist; removing a key just disables that provider's models (graceful).

---

## 8. Open decisions (your call)

- **Replicate vs Fal** for media — Replicate for schema-driven breadth (recommended); Fal for fastest media DX. Can run both later.
- **Credit pricing / margin** — what 1 credit costs the user, and the free-tier grant.
- **Premium TTS** — add **ElevenLabs** for high-end voices, or Gemini/OpenAI TTS is enough?
- **Which models to feature** as defaults per node (cheap ones).

---

## Status

- ✅ Vendor-agnostic adapter layer, durable storage, WS streaming, model-selector (grouping/search/icons), ParamPanel, family/mode.
- ✅ Novita fully removed.
- ✅ **#1 Cost guardrail** — pre-dispatch credit gate (verified) + `/executions/estimate` + daily USD cap + near-cap alert.
- ✅ **#2 OpenRouter text** — 334 models dynamic from `/models`, no host leak. _(needs OpenRouter topup to run.)_
- ✅ **#3 Replicate** — adapter + schema-driven dynamic catalog (collections → schema → ParamSpec). _(needs `REPLICATE_API_TOKEN` to activate/verify.)_
- ✅ **Cost observability** — real `usd` per generation on `usage_record`; `GET /billing/spend` (today/week/month/total); verified end-to-end.
- 🔜 Prod storage + public URL (unblocks i2v) · webhooks + video queue · moderation/retries.
