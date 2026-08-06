# Video Editor — UI Stubs & Wiring Status

Tracks controls that exist in the editor UI but are **not yet functional** (visual only), so we know what's left to wire to real logic/back-ends. Each section lists **Stub** (does nothing / local-state only) vs **Works** (wired to the doc/undo-redo or a real service).

Legend: `[ ]` stub to implement · `[x]` functional today.

---

## Left panel

### AI Tools (`left-panel/ai-tools-panel.tsx`)
- [ ] Gen tiles: **AI Transitions**, **AI Voice**, **AI Dubbing** — marked "Soon", no action
- [ ] Enhance toggles (local state only, no effect): **Clean audio**, **Remove filler words**, **Remove silences**, **Eye contact**, **AI Background expand**, **Remove background**, **Face filter**, **Green screen**, **Subtitles**
- [x] **AI Video / AI Image / B-roll / Characters** tiles — open AI Playground on the right generator
- [x] **Generate with AI** — Assistant/GenPanel flow (uses `use-generation`; verify end-to-end)

### AI Playground modal (`ai-playground/ai-playground.tsx`)
- [ ] Upload tile, **AI model** / aspect / duration chips — visual (model/params not yet passed through)
- [x] **Generate** — runs real text→image/video via `POST /video-editor/projects/{id}/generate` + `useGeneration`; spinner, error, auto-close when the asset lands
- [x] Category nav, prompt textarea, **Enhance** toggle, opens on correct mode

### Video tab (`left-panel/video-tab.tsx`)
- [x] **Talking Characters** — click imports the image (allow-listed CDN via `POST .../import-url`) and adds it to the timeline
- [x] **Stock Videos** — live Pexels search (`GET /video-editor/stock/search?kind=video`); clicking a result imports the mp4 + drops a clip. Needs `PEXELS_API_KEY` server-side (501 → "not set up" message when absent).
- [ ] **View all** links
- [x] **Generate** (opens playground), **Upload**, **Asset Library** tiles drag to timeline

### Audio tab (`left-panel/audio-tab.tsx`)
- [ ] **Voice Cloning**, **Voiceover** buttons
- [ ] **Stock Music** / **Sound Effects** — play buttons, hover add buttons, category chips (cosmetic), waveform is fake
- [ ] Asset Library row play/add buttons (drag-to-timeline works)
- [x] **AI voice** — opens TTS panel, **Upload**, Asset Library rows drag to timeline

### Add Text-to-Speech (`left-panel/add-tts.tsx`)
- [ ] Language selector, **Voice Clone** tab — visual
- [x] **Generate voice** — runs TTS via the generation pipeline (`kind: "audio"`, `params.voice`); actor picker selects the voice; clip lands in the Media pool (needs a working OpenRouter audio/speech model + plan)

### Image tab (`left-panel/image-tab.tsx`)
- [ ] **Generate B-roll images** (upgrade)
- [x] **Stock Images** — live Pexels search (`GET /video-editor/stock/search?kind=image`); click imports + adds to the timeline (needs `PEXELS_API_KEY`)
- [x] **GIFs** — curated Giphy stickers, click imports (Giphy search would need its own key)
- [ ] **Backgrounds** (placeholder gradients)
- [x] **Generate** (opens playground), **Upload**, **Asset Library** tiles drag to timeline

### Text tab (`left-panel/text-tab.tsx`)
- [ ] **View all** links
- [x] Clicking a preset adds a text clip **with its style applied** (font family/size/weight/italic/color written onto the clip and rendered in the preview)

### Subtitles tab (`left-panel/subtitles-tab.tsx`)
- [x] **Auto-subtitle** — transcribes the project audio via `POST /video-editor/projects/{id}/subtitles` (OpenRouter whisper) and drops timeline-mapped caption clips onto a "Subtitles" text track
- [ ] Language / translation / Detect Speakers, **Upload Subtitles File**, **Transcribe Manually → Add Subtitles** — still visual (single-language auto only for now)

### Elements tab (`left-panel/elements-tab.tsx`)
- [x] **Emoji** (text clip), **Shapes** (new `shape` clip kind, SVG), **Animated Stickers** (imported + added to timeline)
- [ ] **Visualizers**, **CTA Pop-Ups** — placeholder art (no real src); **View all** links

### Brand Kit tab (`left-panel/brand-kit-tab.tsx`)
- [x] **Save to Brand Kit** (from any clip's ⋯) persists the asset/colour/**font** in `workspace.preferences.brand_kit`; the tab lists items (images/videos/audio/colours/**fonts**) with remove + click-to-add-to-project. No migration (JSON field).
- [x] **Fonts** — an "Add font" picker saves a family (web-safe list); a saved font tile previews in its family and, on click, applies `fontFamily` to the selected text clip. Renders in the preview and (best-effort, via fontconfig fallback) in export — see notes #4.

---

## Clip inspector (`inspector/inspector.tsx`)

### Video clip
- [ ] Edit with Script, **Animations** / **Adjust** tiles, **Fade Audio**
- [x] **Remove Filler Words** / **Magic Cut** (video) — transcribe → drop um/uh segments → re-render trimmed mp4 (extends `.../magic-cut` to video; ffmpeg, no provider), swaps in the result
- [x] **Face Filter** — async touch-up on the clip-op path (Replicate, model via `FACE_FILTER_MODEL`; 501 until set)
- [ ] **AI Tools** list remaining: AI Background Expand, Magic B-Roll, AI Transitions (each = one `clip_ops._OPS` entry + a model)
- [x] **Remove Background** & **Eye Contact** — async ops on the worker (`POST .../clip-op` → `run_clip_op` → Replicate; editor polls the Execution then swaps in the result). Remove-bg uses RVM; Eye Contact's model is operator-supplied via `EYE_CONTACT_MODEL` (501 until set). Gated on `REPLICATE_API_KEY`.
- [x] **Green Screen** (ffmpeg chromakey → transparent webm), **Speed**, **Volume**, **Opacity**, **Rotation**, **Flip H/V**, **Round Corners**, **Replace**, **Detach Audio**, **Start/End**, **Delete**

### Audio clip
- [ ] **Fade In/Out**
- [x] **Clean Audio** (ffmpeg denoise) & **Remove Silences** (ffmpeg silenceremove) via `.../enhance`, plus **Magic Cut** (transcribe → cut filler words) via `.../magic-cut` — swaps the clip to the processed asset; **Mute/Unmute**, **Speed**, **Volume**, **Replace**, **Start/End**, **Delete**

### Image clip
- [ ] **Generate Video**, **Animations** / **Adjust** tiles
- [x] **Remove Background** — Replicate matting (`POST .../remove-bg`) → cutout PNG swapped in; gated on `REPLICATE_API_KEY` (501 → toast when absent)
- [x] **Opacity**, **Rotation**, **Flip H/V**, **Round Corners**, **Replace**, **Start/End**, **Delete**

### Text clip
- [ ] **Styles** presets, **Animations** tile, **Text Behind Person**
- [x] Text **content**, **font family**, **font size**, **color**, **Bold/Italic**, **alignment**, **line height**, **letter spacing** (all drawn in the preview), **Start/End**, **Delete**, **Add Another Text Box**

---

## Floating clip toolbar (`clip-toolbar/clip-toolbar.tsx`)

- [ ] **Video** overflow menu: Fit/Fill, Filters, Effects, Adjust, Replace Video
- [ ] **Audio** overflow: Replace Audio
- [ ] **Image**: Adjust; overflow: Fit/Fill, Replace Image
- [ ] **Text**: font / size display (edit in inspector), Effect, Depth; overflow: Line Height, Letter Spacing, Properties (color, Bold/Italic, align now work)
- [x] **Volume**, **Speed** popovers; **Opacity** slider; **Flip H/V** & **Round Corners** (video/image); **Copy** (duplicate); **Order** (front/back); **Adjust Timing**; **Save to Brand Kit**; **Delete**; Animation/Transitions open their panels; image **Generate Video** opens the playground

---

## Animations & Transitions panels

### Animations (`animations-panel/animations-panel.tsx`)
- [x] **In / Out / Loop / Zoom presets render at playback** — driven by `lib/animation-engine.ts` (`animate(clip, playhead)`), applied in the preview for media + text; selection persists on the clip

### Transitions (`transitions-panel/transitions-panel.tsx`)
- [x] Presets render — `clip.transition` burns an alpha fade-in at the clip boundary in **preview** (`txFade`) and **export** (`render.py` ffmpeg `fade`), reading as a crossfade over what's beneath. Per-style motion (glitch/zoom/orbit) approximates to the crossfade for now.
- [ ] **Create new AI Transition** form — Start/End video pickers, prompt, **Generate (50)** — still visual (needs a two-frame morph/interpolation model + insert-clip-between)
- [x] Selection persists on the clip

---

## Preview & chrome

### Preview control bar (nothing selected) (`preview/preview.tsx`)
- [ ] **Settings** button
- [x] **Aspect ratio** picker (+ platform overlays), **Background** — color picker + **Image** tab (pick a project image, stored as `asset:<id>`); color also renders in exports; on-canvas move/resize/snap

### Top header (`pages/video-editor-page.tsx`)
- [x] **Duplicate Project** — clones the workflow + doc (`POST .../duplicate`, media flattened to shared upload refs) and opens the copy
- [x] **Version History** — snapshot the doc / restore any past version (`.../versions`, stored in `workspace.preferences`, no migration)
- [x] **Save as Template** — snapshots the project (flattened to shared upload refs) into `workspace.preferences.templates` (`POST .../templates`); the `/templates` page lists them and **Use template** spins each into a fresh workflow+project
- [x] Cloud save indicator, title edit, **Undo/Redo**, **Export & Publish**

---

## Notes / dependencies

Most stubs fall into a few buckets — implementing the bucket unlocks many rows at once:

1. **Generation back-end** (text->image/video, TTS, dubbing, AI transitions, characters) -> AI Playground, Add-TTS, most AI Tools tiles, Generate buttons.
2. **Per-clip AI enhancement** — Clean Audio (denoise) + Remove Silences DONE (ffmpeg, `POST .../enhance`). Green Screen DONE (ffmpeg chromakey). Background removal DONE for **images** (sync, `POST .../remove-bg`) **and video** (async worker path, `POST .../clip-op` → `run_clip_op` → Replicate RVM, polled via the Execution). Both gated on `REPLICATE_API_KEY`. **Eye Contact DONE** (async, operator-supplied model via `EYE_CONTACT_MODEL`). The async path (`clip_ops.run_op` + `run_clip_op`) is the reusable foundation for any slow ML op — **Remove Filler Words DONE** for video too (ffmpeg, extends `.../magic-cut`). **Face Filter DONE** (async, `FACE_FILTER_MODEL`). Remaining ones (AI dubbing/transitions, background-expand, magic b-roll) just need a model + an entry in `clip_ops._OPS`.
3. **Animation/Transition render engine** — Animations DONE (`lib/animation-engine.ts`). Transition presets DONE — `clip.transition` renders as a boundary alpha fade-in (crossfade) in preview + export. Remaining: the AI-generated morph transition (two-frame interpolation model → inserted clip).
4. **Richer text renderer** — DONE in preview AND export: per-clip font-family/size/color/bold/italic/align/letter-spacing/opacity + position now burn into the MP4 via per-event ASS overrides (`render.py build_text_ass`; subtitle-track clips keep the bottom-center caption pill). Ceilings: libass only renders bundled fonts faithfully (Poppins/Anton/Bangers) — other families fall back via fontconfig; line-height and text effects/text-behind-person still unsupported in export.
5. **Transform extras** — DONE: Flip (H/V), Round Corners, Fit/Fill, and Order/z-index (via `transform.flipH/flipV/radius/fit/z`). Remaining: filters/effects.
6. **Stock/asset providers** — stock **video + image** DONE via Pexels search (`/video-editor/stock/search`, gated on `PEXELS_API_KEY`; imports through the existing `/import-url` allow-list). Remaining: music/SFX, animated stickers search, characters (each needs its own provider/key).
7. **Brand Kit** — DONE (save/list/remove assets + colours + **fonts** in `workspace.preferences`; add-to-project; a saved font applies its family to the selected text clip, rendered in preview + best-effort export). Remaining: subtitle styles, custom uploaded font files (export can only bundle a few faces — see #4).
8. **Project actions** — Duplicate + Version History + Save as Template all DONE (templates stored in `workspace.preferences`, surfaced on the `/templates` page).
