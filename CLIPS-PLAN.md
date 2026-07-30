# Flappy Clips — Automated Video Repurposing & Short-Form Clipping

Turn one long video into N platform-ready vertical clips: paste a link or drop a file,
Flappy transcribes it, an LLM picks the strongest moments, ffmpeg cuts/reframes/captions
them, and the results land in the same media pool the canvas and timeline editor already
share.

This plan adapts the generic spec to Flappy's actual system: FastAPI feature modules,
Celery worker, MinIO storage, Postgres + alembic, the OpenRouter adapter with the
existing credit guardrails, the EditorDoc/ffmpeg render pipeline, and the Next.js
`(app)` shell with the left sidebar.

---

## 1. Where it lives

| Piece | Location | Follows the pattern of |
|---|---|---|
| UI route | `apps/web/src/app/(app)/clips/page.tsx` (+ `/clips/[jobId]`) | `video-editor`, `assets` |
| Frontend feature | `apps/web/src/features/clips/` | `features/video-editor/` |
| Sidebar entry | "Clips" (Scissors icon) in `shared/constants/navigation.ts`, under Canvas | existing nav items |
| API feature | `apps/api/app/features/clips/` (`models.py`, `router.py`, `repository.py`, `pipeline.py`) | `features/video_editor/` |
| Worker task | `apps/worker/app/jobs/` → `run_clips_job(job_id)` | `run_workflow_task` |
| Migration | `apps/api/alembic/versions/…_clips_job.py` | `e5f6a7b8c9d0_share_links` |

**Why not a workflow-graph execution?** The pipeline is a fixed linear chain
(ingest → transcribe → select → render), not a user-editable graph. A dedicated Celery
task with a status row is simpler and the UI can show honest phase progress. It still
reuses the same billing ledger and the OpenRouter adapter for the LLM call.

## 2. Data model

```
ClipsJob (table: clips_job)
  id, workspace_id, workflow_id?         # optional link into a project
  source_url | source_key                # URL import or uploaded file in MinIO
  params JSON                           # {count, duration: short|medium|long|auto,
                                        #  ratio: 9:16|1:1|16:9, focus, captions: bool,
                                        #  framing: bool, caption_style}
  status: queued|running|completed|failed
  phase: ingest|transcribe|select|render  + progress (0-1)
  error, transcript JSON                # [{word, start, end}]
  clips JSON                            # [{id, title, score, reason, start, end,
                                        #  duration, key, url?, srt}]
```

One table; clips are JSON on the job (they're immutable artifacts + small metadata —
a separate table adds nothing until clips need their own lifecycle). Rendered clips are
also registered as workflow assets when the job is attached to a project, so they appear
in the canvas/editor media pool automatically.

## 3. Pipeline (Celery task, per-phase status updates)

### Phase 1 — Ingest
- **Upload**: reuse the existing MinIO upload path (same 100 MB cap to start).
- **URL**: `yt-dlp` (new Python dep) fetches YouTube/Vimeo/TikTok/Drive to a temp file →
  stored at `{ws}/clips/{job}/source.mp4`. yt-dlp is the industry workhorse; it also
  hands us duration/title metadata for free.
- `ffprobe` (already shipped via `imageio_ffmpeg`) validates duration/streams.

### Phase 2 — Transcribe (word timestamps)
- **`faster-whisper` (local, new dep)** with the `small` model: free per-run, offline,
  real word-level timestamps — exactly what caption highlighting needs.
- Why not OpenRouter for ASR: chat-audio models return prose, not reliable word
  timings, and every minute would bill. Whisper runs on the worker box.
- Ceiling: CPU transcription ≈ 0.3–1× realtime for `small`. Fine for MVP; the model
  name goes in `settings` so a GPU box can swap in `large-v3` later.

### Phase 3 — Select (the only paid AI call)
- One text-model call through the **existing OpenRouter adapter** (default: a cheap
  fast model, e.g. Gemini Flash via `resolve_model("text", …)`), charged through the
  **existing credit ledger** like any generation.
- Input: the timestamped transcript + user's focus prompt + requested count/duration.
  Output (JSON, schema-validated): `[{start, end, title, score 0-100, reason}]` —
  hook strength, completeness, engagement rationale.
- Guardrails: segments clamped to transcript bounds, snapped to word boundaries,
  duration forced into the selected band, overlaps merged, deterministic fallback
  (evenly-spaced segments) if the model returns garbage — the job never dies on a
  malformed LLM response.

### Phase 4 — Render (ffmpeg, same toolchain as the editor)
Per clip: `-ss/-to` cut → aspect conversion → caption burn → `{ws}/clips/{job}/{clip}.mp4`.
- **9:16 / 1:1 from landscape**: v1 does a **single smart crop per clip** — one face
  detection pass (OpenCV Haar cascade, tiny dep, no model download) on a few sampled
  frames picks the crop center; static crop follows.
  `# ponytail: static smart crop; per-frame speaker tracking is M3`
- **Captions**: word-timestamped **ASS subtitles** (karaoke tags give the
  active-word highlight) burned via ffmpeg's `subtitles` filter; a bundled font ships in
  the repo. Styles = 3 presets stored in `params.caption_style`.
  Fallback if the ffmpeg build lacks libass: `drawtext` per word group (plainer, works
  everywhere) — detected once at startup, not per job.
- SRT for each clip is also generated (free — we already have `buildCaptions`-style
  logic server-side) and stored next to the MP4.

### Phase 5 — Deliver
- Job flips `completed`; clips JSON carries keys → presigned URLs.
- If the job belongs to a project: each clip is added to the workflow media pool
  (same trick as editor uploads), so **"Open in editor"** seeds a timeline instantly.
- **Batch zip** endpoint streams a zip of all clips.

## 4. API

```
POST /api/v1/clips/jobs               {source_url?|source_key?, params, workflow_id?}
                                      → 402 via credit pre-check, else {job_id}
POST /api/v1/clips/upload             multipart → {source_key}   (reuses upload code)
GET  /api/v1/clips/jobs               list for workspace (recent first)
GET  /api/v1/clips/jobs/{id}          full job incl. phase/progress/clips (UI polls)
POST /api/v1/clips/jobs/{id}/clips/{cid}/rerender   {start?, end?, transcript_edits?}
                                      → re-cuts one clip after trim/caption edits
GET  /api/v1/clips/jobs/{id}/zip      streamed zip of all clip MP4s
DELETE /api/v1/clips/jobs/{id}
```

Polling (2s) over websockets: jobs are minutes-long and coarse-grained; the executions
websocket pattern is overkill here. `# ponytail: poll; upgrade to WS if users stare`

## 5. UI / UX — zero-hassle by design

**Route `/clips`, sidebar "Clips".** One screen, one decision.

1. **Landing = a single input.** A large drop-zone card: *"Paste a video link or drop a
   file"* — one field accepts both (detects URLs on paste; drag-drop anywhere on the
   card). Under it, one primary button: **Get clips**. That's the whole happy path —
   every option has a smart default (Auto count → let AI pick up to 5, Auto duration,
   9:16, captions ON, auto-framing ON).
2. **Options as pills, not a form.** A single row of compact pill-selects below the
   input (Clips · Length · Ratio · Captions · Framing) plus an optional "What should we
   look for?" text field. Collapsed by default behind "Options"; the defaults are good
   enough that most users never open it.
3. **Progress that tells the truth.** After submit → `/clips/{jobId}`: a 4-step phase
   tracker (Fetch → Transcribe → Pick moments → Render) with the current phase animated
   and per-phase captions ("Transcribing 14 min of audio…"). Failure shows the real
   error (same philosophy as the node-failure fix) with a Retry button.
4. **Clip Review Gallery.** Cards in the target aspect: hover-scrub thumbnail, title,
   duration chip, **Score badge** (0–100 with the LLM's one-line reason on hover).
   Actions per card: ▶ Preview, Download, **Open in editor**, ⋯ (copy link, delete).
5. **Review modal** (click a card): player + **trim handles** on a mini-timeline +
   **editable transcript list** (fix typos, toggle word highlight). "Apply" calls
   `rerender` for just that clip — a seconds-long ffmpeg job, not a full re-run.
6. **Exit ramps.** "Download all (.zip)" top-right; every clip's "Open in editor"
   drops the user into the existing timeline editor with the clip + its caption track
   seeded — from there the whole existing Export panel (socials, share links, GIF)
   already works. Repurposing plugs into the ecosystem instead of duplicating it.
7. **Recents.** Below the landing input: the last jobs as small rows (source thumb,
   title, N clips, date) so returning users are one click from previous results.

## 6. Billing & limits

- Credit pre-check at job creation (existing `has_credits` / 402 path).
- Charge = 1 LLM selection call + per-clip render fee (flat credits per clip, e.g. 2);
  transcription is local so it's free margin. Numbers live in `settings`, not code.
- Free plan: cap source length (e.g. 30 min) and 3 jobs/day — enforced at POST.

## 7. Milestones

- **M1 — the magic works (ship first):** upload + URL ingest, whisper transcript, LLM
  selection, straight cuts with center/static-smart crop, gallery with scores/titles,
  per-clip download, recents. No captions burn yet, no trim UI.
- **M2 — polish the output:** ASS styled captions (3 presets) + SRT downloads, trim
  handles + transcript editor + single-clip re-render, zip download, "Open in editor"
  seeding.
- **M3 — the showy stuff:** per-frame active-speaker tracking (mediapipe), animated
  caption presets, virality-score explanations panel, scheduled/social handoff via the
  Export panel, websocket progress.

## 8. New dependencies & risks

| Dep | Why | Risk |
|---|---|---|
| `yt-dlp` | URL ingest | Site breakage is routine → pin + surface real errors; Drive links need `cookies`-free public files only |
| `faster-whisper` | word-timestamp ASR | CPU speed; model download on first run (~460 MB for `small`) |
| `opencv-python-headless` | face detect for smart crop | Haar is crude — acceptable for static crop, replaced in M3 |
| bundled `.ttf` font | caption burn | license: use Inter/Noto (OFL) |
| libass in ffmpeg build | styled captions | imageio_ffmpeg builds usually include it; runtime-detect + drawtext fallback |

Copyright note: URL import will happily fetch content the user doesn't own; add a
one-line "only import content you have rights to" notice under the input (same trust
posture as uploads).

## M5 — Direct publishing to connected accounts

One `social` feature owns account connections and platform uploads; the clips
schedule pipeline grows an optional account per post.

- **Connections**: `SocialAccount` table (workspace, platform, tokens, meta).
  OAuth connect per provider — YouTube rides the existing Google app (needs the
  YouTube Data API enabled + `youtube.upload` scope), TikTok and Meta get their
  own env keys (`TIKTOK_CLIENT_KEY/SECRET`, `FACEBOOK_APP_ID/SECRET`). One Meta
  connect discovers Facebook pages AND their linked Instagram business accounts.
  Callback is a popup that posts `flappy:social-connected` back to the app.
  Unconfigured providers surface honestly as "awaiting app approval".
- **Publishers** (`social/publishers.py`): YouTube resumable upload,
  TikTok FILE_UPLOAD direct post, Instagram Reels container + publish (pull from
  presigned URL), Facebook page video via `file_url`. Tokens auto-refresh
  (google/tiktok); Meta page tokens don't expire.
- **Publish now**: `POST /clips/jobs/{id}/clips/{clip_id}/publish {account_ids,
  caption}` creates `ScheduledPost` rows (status `posting`) and dispatches the
  `publish_post` worker task per account. The task burns captions in the job's
  style (same artifact as download) and uploads.
- **Schedule**: `ScheduleConfig.account_ids` fans each slot out to one post per
  account. Beat's `promote_due_posts` dispatches `publish_post` for
  account-backed posts; account-less posts stay manual ("ready to post").
- **UI**: Publish panel lists platforms with connect/disconnect + account
  selection, caption box, live per-account status (posting → posted with link /
  failed with error). Schedule modal gains "Auto-post to" account chips.
  Posting queue shows posting/posted/failed with the post link.
- Deferred: X + LinkedIn publishers (paid/approval-heavy APIs), token
  encryption at rest, retry/backoff on transient platform errors.
