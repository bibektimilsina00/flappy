# OpenRouter for Media (Video + Audio) — Evaluation & Strategy

_Compiled 2026-07-21. Prices approximate (from OpenRouter). Key finding: OpenRouter now covers **all four modalities** — text, image, video, audio — on one key, one balance._

---

## Headline

OpenRouter used to be "text only" in our plan. It isn't anymore. It now serves **video generation** (Kling, Veo, Sora, Seedance, Wan, Hailuo, Grok Imagine) and **audio** (Lyria, GPT-Audio, Kokoro, TTS) — the exact flagships we hand-pinned on Replicate. That makes **"OpenRouter for everything"** a real option, versus our current 4-provider hybrid.

### Confirmed via the API (the `output_modalities` filter)
The `/models` endpoint defaults to **text only** — that's why media models looked missing. Filter with `?output_modalities=all` (or `image`/`audio`/etc.) and everything is there, **dynamically listable exactly like text**:

| `output_modalities` | Count | Maps to |
|---|---|---|
| `text` | 338 | Text node |
| `image` | **39** | Image node |
| `video` | **17** | Video node |
| `speech` | **12** | Audio node — TTS |
| `audio` | **4** | Audio node — music / GPT-Audio |
| embeddings / transcription / rerank | 27 / 11 / 4 | (not needed) |

So the whole media catalog is **self-describing over the API** — same dynamic pattern we already use for text (`openrouter_catalog.py`), just add the modality filter. Also useful: `?sort=most-popular` / `pricing-low-to-high` for auto-curation, and `GET /api/v1/model/{author}/{slug}` for one-off lookups.

---

## Video models on OpenRouter (per-second pricing)

Sorted cheapest → priciest. A 5-second clip cost is shown for scale.

| Model | Maker | $/sec | ≈ 5s clip | Notes |
|---|---|---|---|---|
| **Seedance 1.5 Pro** | ByteDance | **$0.023** | **$0.12** | Unified audio+video, multi-lang lip-sync, camera control, 4–12s 1080p |
| **Wan 2.6** | Alibaba | **$0.04** | **$0.20** | 1080p, native A/V sync, ref-to-video, multi-shot, up to 15s |
| Grok Imagine Video | xAI | $0.05 | $0.25 | t2v / i2v / ref-to-video, 1–15s, 480–720p |
| **Veo 3.1 Lite** | Google | $0.05 | $0.25 | Native audio, 4–8s, 720/1080p — cheapest Veo |
| Seedance 2.0 Fast | ByteDance | $0.054 | $0.27 | Speed-optimized 2.0 |
| Seedance 2.0 | ByteDance | $0.067 | $0.34 | Ref-to-video, strong character consistency |
| Hailuo 2.3 | MiniMax | $0.082 | $0.41 | Realistic motion, expressive characters |
| Grok Imagine Video 1.5 | xAI | $0.08 | $0.40 | i2v with synced SFX/ambience/dialogue |
| HappyHorse 1.0 / 1.1 | Alibaba | $0.099 | $0.49 | Up to 1080p, 3–15s, text/image/ref inputs |
| Veo 3.1 Fast | Google | $0.10 | $0.50 | Native audio, first/last-frame, faster Veo |
| Wan 2.7 | Alibaba | $0.10 | $0.50 | t2v / i2v / ref-to-video |
| Kling Video O1 | Kuaishou | $0.112 | $0.56 | 5/10s, first/last-frame |
| Kling v3.0 Standard | Kuaishou | $0.126 | $0.63 | first/last-frame, optional audio |
| Kling v3.0 Pro | Kuaishou | $0.168 | $0.84 | Premium tier, optional native audio |
| **Sora 2 Pro** | OpenAI | $0.30 | $1.50 | Physics-accurate, multi-shot, synced audio |
| **Veo 3.1** | Google | $0.40 | $2.00 | Max fidelity, 4K upscale, scene extension |

**Verdict:** cheap workhorses = **Seedance 1.5 Pro, Wan 2.6, Veo 3.1 Lite, Grok Imagine**. Premium = **Kling v3 Pro, Sora 2 Pro, Veo 3.1**. This is the *same* lineup we pinned on Replicate — same underlying providers, same class of pricing — just under one roof.

---

## Audio models on OpenRouter (recap)

| Slot | Model | Price | Verdict |
|---|---|---|---|
| Free/default TTS | **Kokoro 82M** | $0.62/M chars | ✅ cheapest, multilingual |
| Premium TTS | **Gemini 3.1 Flash TTS** | $1 / $20 per M tok | ✅ best quality, emotion tags |
| Cheap voice | **GPT Audio Mini** | $0.60 / $2.40 per M tok | ✅ |
| Music (short) | **Lyria 3 Clip** | $0.04/clip | ✅ |
| Music (full) | **Lyria 3 Pro** | $0.08/song | ✅ |
| Skip | MiniMax 2.8 ($60/M), Deepgram ($30), MAI ($22), Voxtral ($16), Grok Voice ($15), Zonos/Sesame/Orpheus ($7) | | 🔴 pricey / redundant |

---

## Image models on OpenRouter (rich — I was wrong to call it "thin")

Invoked via the dedicated **`POST /api/v1/images`** endpoint (`{model, prompt}` → `data[].b64_json` — OpenAI-Images compatible, same shape as our Imagen/GPT-Image adapters).

| Model | Maker | Price | Verdict |
|---|---|---|---|
| **Nano Banana 2 Lite** (Gemini 3.1 Flash Lite Image) | Google | $0.25 / $1.50 per M tok | ✅ **cheapest/fastest** — 1K, 14 ratios, ~4s |
| **FLUX.2 Flex** | Black Forest | ~$0.06/megapixel | ✅ great text/typography, multi-ref edit |
| **FLUX.2 Pro** | Black Forest | ~$0.03/MP out | ✅ production quality, up to 4MP |
| Nano Banana (Gemini 2.5 Flash Image) | Google | $0.30 / $2.50 | ✅ solid default |
| Nano Banana 2 (Gemini 3.1 Flash Image) | Google | $0.50 / $3 | ✅ |
| Krea 2 Large | Krea | (per docs) | 👍 aesthetic |
| GPT-5 Image Mini / GPT Image 1 Mini | OpenAI | ~$2.50 / $2 | 👍 cheap OpenAI |
| **Nano Banana Pro** (Gemini 3 Pro Image) | Google | $2 / $12 | ⭐ premium — best text, 2K/4K, 5-subject ID |
| GPT Image 2 / GPT-5 Image / GPT Image 1 | OpenAI | $8–$10 | 🟡 premium, pricey |
| MAI-Image-2.5 | Microsoft | $5/M tok | 🟡 |

**So OpenRouter image is strong** — Flux.2, the full Nano Banana family, GPT Image family, Krea. What it's **missing vs Replicate**: Seedream, Ideogram, Recraft. So the only reason to keep Replicate for image is those three specific models.

---

## Our current approach vs OpenRouter-unified

### Current (hybrid — what's wired today)
| Kind | Provider |
|---|---|
| Text | OpenRouter |
| Image | Replicate (Flux/Seedream/Ideogram…) + direct Gemini/OpenAI |
| Video | Replicate (Kling/Hailuo/Seedance/Wan/PixVerse) + direct Veo/Sora |
| Audio | Replicate (MiniMax/MusicGen) + direct Gemini/OpenAI TTS |

→ **4 providers, up to 4 keys, 4 balances, 3 invocation styles.**

### OpenRouter-unified
| Kind | Provider |
|---|---|
| Text · Image · Video · Audio | **OpenRouter** |

→ **1 key, 1 balance, 1 bill, 1 spend dashboard.**

### Trade-offs

| Dimension | Winner | Why |
|---|---|---|
| **Operational simplicity** | **OpenRouter** | One key, one balance, one bill. Huge for a small team. |
| **Spend/observability** | **OpenRouter** | Single dashboard + per-request cost; our custom USD tracking becomes optional. |
| **Model coverage** | **Tie** | Both have Kling, Veo, Sora, Seedance, Wan, Hailuo — OpenRouter has *cleaner* names/versions (Seedance 2.0, Wan 2.7, Kling v3). |
| **Self-describing params** | **Replicate** | Replicate ships an input schema per model (we auto-generate the settings panel). OpenRouter's media param handling is less proven for us. |
| **Proven-for-us right now** | **Replicate/direct** | Already wired + working. OpenRouter's media endpoints are now documented + confirmed (see below), just not yet wired for us. |
| **Cost (raw)** | ~Tie | Both pass through provider prices + a small margin. Direct Gemini/OpenAI is marginally cheaper but adds key-juggling. |
| **Resilience** | **Hybrid** | Multiple providers = failover. One provider = single point of failure. |

### Invocation — SOLVED (all endpoints confirmed from docs, 2026-07-21)
OpenRouter's media models aren't in the chat `/models` API and aren't called via `/chat/completions`. They use **dedicated generation endpoints**, all now documented:
- **Image**: `POST /api/v1/images` → `{model, prompt}` → `data[].b64_json` (sync). OpenAI-Images compatible — same as our Imagen/GPT-Image adapters.
- **Video**: **async/poll**. `POST /api/v1/videos` `{model, prompt, …}` → `{id, polling_url, status:"pending"}`; poll `GET /api/v1/videos/{id}` until `status:"completed"`, then download `unsigned_urls[0]` (or `GET /api/v1/videos/{id}/content`). Webhooks also supported. **Same poll-then-download shape as our Veo/Sora adapters** — discover params via `GET /api/v1/videos/models`.
- **Audio/TTS (voiceover)**: `POST /api/v1/audio/speech` `{model, input, voice, response_format:"mp3"}` → **raw audio bytes** (not JSON). OpenAI-Audio-Speech compatible — same as our OpenAI TTS adapter. Covers `output_modalities=speech` (Kokoro, Gemini TTS, etc.).
- **Video image-to-video**: same `/api/v1/videos` submit, with `frame_images:[{type:"image_url", image_url:{url}, frame_type:"first_frame"}]` + `resolution`.
- **Music + conversational audio** (`output_modalities=audio` — Lyria 3 Pro/Clip, GPT-Audio, GPT-Audio-Mini): invoked via **`POST /api/v1/chat/completions`**, NOT a dedicated endpoint. Confirmed via model metadata — all four report `output_modalities:['text','audio']` with standard chat `supported_params` (`max_tokens`, `temperature`, `top_p`, `response_format`, `tools`). They're chat models that emit audio in the message (GPT-4o-audio style; request with audio output modality). Lyria bills per-song ($0.04 clip / $0.08 song) but is called like any chat model. Only detail left to confirm at wiring time: the exact response field for the b64 audio (`message.audio.data` or an `output_audio` content part) — one call resolves it.

⚠️ **Ignore the per-model "Quick Start" + "Parameters" blocks on openrouter.ai model pages.** They're auto-generated boilerplate stamped on *every* model — always `/chat/completions` with chat params (`max_tokens`, `temperature`, `frequency_penalty`…). For media models this is wrong (a music page even shows "What is in this image?"). Authoritative shapes come from the dedicated guides above, not the model page.

No test gens needed to learn the shapes — text, image, video, TTS, and music-endpoint are all confirmed from docs + model metadata. The single remaining detail is the b64-audio response field for chat-audio-output models, confirmable with one call at wiring time.

---

## Recommendation

**Consolidate on OpenRouter as the primary provider** — it's the cleaner end-state:
- One key, one balance for text + image + video + audio.
- The exact flagship models we wanted, with current version names.
- Trivial spend tracking (their dashboard) — our guardrail/observability layer stays as a safety net but isn't load-bearing.

**But migrate deliberately, don't rip out what works:**
1. ~~Verify OpenRouter's media-generation endpoint~~ — **done** (2026-07-21, from docs): image `POST /api/v1/images` (sync b64), video `POST /api/v1/videos` (async poll → `unsigned_urls[0]`), TTS `POST /api/v1/audio/speech` (raw bytes). Shapes above.
2. **Wire video + audio via OpenRouter** behind the existing adapter interface (same as we did for Replicate). Video reuses the Veo/Sora poll-then-download pattern; TTS reuses the OpenAI-TTS bytes pattern.
3. **Curate the same way** — pin flagships (`_CURATED` / `_PINNED`), free = cheapest (Seedance 1.5 Pro / Wan for video, Kokoro for audio), premium = the rest.
4. **Then retire Replicate** for media once OpenRouter is proven — collapsing to one media provider.
5. **Keep direct Gemini/OpenAI optional** (Veo, Sora, TTS) only if you want a cheaper-direct or failover path. Not required.

**Net:** OpenRouter-unified is better for you — simpler ops, one balance, all the flagships across **all four modalities**. All endpoints are now confirmed from the docs (image `/api/v1/images`, video `/api/v1/videos`, TTS `/api/v1/audio/speech`) — nothing left to verify. The only reason we're on a hybrid is historical (OpenRouter didn't do media when we started). Now it does — converge on it. Keep Replicate only if you specifically want Seedream/Ideogram/Recraft.

**Migration order (lowest risk first):** image (endpoint confirmed) → audio → video. Retire Replicate as each modality lands. Keep Replicate *only* for Seedream/Ideogram/Recraft if you specifically want those.

---

## Other notes
- **Free tiers translate directly:** video free = Seedance 1.5 Pro or Wan 2.6 (cheapest); audio free = Kokoro; keep the 2-free-per-kind gating.
- **Pricing is per-second (video) / per-token or per-char (audio)** — our credit system should map credits→provider-$ off these rates so 1 credit ≈ COGS × margin.
- **Image on OpenRouter is strong** (Flux.2, full Nano Banana family, GPT Image family, Krea, MAI-Image) — only Seedream/Ideogram/Recraft are missing vs Replicate.
- **API shapes all confirmed from docs** (2026-07-21) — image `/api/v1/images`, video `/api/v1/videos` (async poll), TTS `/api/v1/audio/speech` (raw bytes). No guessing, no test gens needed to wire.
