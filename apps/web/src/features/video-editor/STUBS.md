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
- [ ] **Talking Characters** grid — external thumbnails, click does nothing
- [ ] **Stock Videos** — category chips filter is cosmetic; tiles don't add/drag to timeline
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
- [ ] **Stock Images**, **Backgrounds**, **GIFs** — tiles don't add to timeline; chips cosmetic
- [x] **Generate** (opens playground), **Upload**, **Asset Library** tiles drag to timeline

### Text tab (`left-panel/text-tab.tsx`)
- [ ] **View all** links
- [x] Clicking a preset adds a text clip

### Subtitles tab (`left-panel/subtitles-tab.tsx`)
- [x] **Auto-subtitle** — transcribes the project audio via `POST /video-editor/projects/{id}/subtitles` (OpenRouter whisper) and drops timeline-mapped caption clips onto a "Subtitles" text track
- [ ] Language / translation / Detect Speakers, **Upload Subtitles File**, **Transcribe Manually → Add Subtitles** — still visual (single-language auto only for now)

### Elements tab (`left-panel/elements-tab.tsx`)
- [x] **Emoji** (adds a text clip) and **Shapes** (rect/rounded/ellipse/triangle/star — new `shape` clip kind, rendered as SVG, movable/resizable/animatable)
- [ ] **Animated Stickers**, **Visualizers**, **CTA Pop-Ups** — need image-from-URL / asset registration; **View all** links

### Brand Kit tab (`left-panel/brand-kit-tab.tsx`)
- [ ] **Entire tab** is empty-state — search, workspace picker, upload, tag filters, all "No ..." sections; no save/load back-end

---

## Clip inspector (`inspector/inspector.tsx`)

### Video clip
- [ ] Edit with Script, **Animations** / **Adjust** tiles, **Fade Audio**
- [ ] **AI Tools** list (11 items: Clean Audio, Eye Contact, Remove Background, Remove Silences, Remove Filler Words, AI Background Expand, Magic B-Roll, AI Transitions, Face Filter, Magic Cut, Green Screen)
- [x] **Speed**, **Volume**, **Opacity**, **Rotation**, **Flip H/V**, **Round Corners**, **Replace**, **Detach Audio** (ffmpeg extract → new audio clip, mutes the video), **Start/End**, **Delete**

### Audio clip
- [ ] **Fade In/Out**, **Magic Cut** (needs AI)
- [x] **Clean Audio** (ffmpeg denoise) & **Remove Silences** (ffmpeg silenceremove) via `POST /video-editor/projects/{id}/enhance` — swaps the clip to the processed asset; **Mute/Unmute**, **Speed**, **Volume**, **Replace**, **Start/End**, **Delete**

### Image clip
- [ ] **Generate Video**, **Animations** / **Adjust** tiles
- [x] **Opacity**, **Rotation**, **Flip H/V**, **Round Corners**, **Replace**, **Start/End**, **Delete**

### Text clip
- [ ] **Styles** presets, **Animations** tile, **Text Behind Person**
- [x] Text **content**, **font family**, **font size**, **color**, **Bold/Italic**, **alignment**, **line height**, **letter spacing** (all drawn in the preview), **Start/End**, **Delete**, **Add Another Text Box**

---

## Floating clip toolbar (`clip-toolbar/clip-toolbar.tsx`)

- [ ] **Video** overflow menu: Fit/Fill, Filters, Effects, Adjust, Adjust Timing, Replace Video, Detach Audio, Save to Brand Kit
- [ ] **Audio** overflow: Adjust Timing, Replace Audio, Save to Brand Kit
- [ ] **Image**: Adjust; overflow: Fit/Fill, Adjust Timing, Replace Image, Save to Brand Kit
- [ ] **Text**: font / size display (edit in inspector), Effect, Depth; overflow: Line Height, Letter Spacing, Save to Brand Kit, Properties, Adjust Timing (color, Bold/Italic, align now work)
- [x] **Volume**, **Speed** popovers; **Opacity** slider; **Flip H/V** & **Round Corners** (video/image); **Copy** (duplicate); **Order** (front/back); **Delete**; Animation/Transitions open their panels; image **Generate Video** opens the playground

---

## Animations & Transitions panels

### Animations (`animations-panel/animations-panel.tsx`)
- [x] **In / Out / Loop / Zoom presets render at playback** — driven by `lib/animation-engine.ts` (`animate(clip, playhead)`), applied in the preview for media + text; selection persists on the clip

### Transitions (`transitions-panel/transitions-panel.tsx`)
- [ ] Presets don't render (`clip.transition` stored, no engine)
- [ ] **Create new AI Transition** form — Start/End video pickers, prompt, **Generate (50)** — all visual
- [x] Selection persists on the clip

---

## Preview & chrome

### Preview control bar (nothing selected) (`preview/preview.tsx`)
- [ ] **Settings** button
- [ ] Background -> **Image** tab ("coming soon")
- [x] **Aspect ratio** picker (+ platform overlays), **Background color** picker, on-canvas move/resize/snap

### Top header (`pages/video-editor-page.tsx`)
- [x] **Duplicate Project** — clones the workflow + doc (`POST .../duplicate`, media flattened to shared upload refs) and opens the copy
- [ ] **Save as Template**, **Version History**
- [x] Cloud save indicator, title edit, **Undo/Redo**, **Export & Publish**

---

## Notes / dependencies

Most stubs fall into a few buckets — implementing the bucket unlocks many rows at once:

1. **Generation back-end** (text->image/video, TTS, dubbing, AI transitions, characters) -> AI Playground, Add-TTS, most AI Tools tiles, Generate buttons.
2. **Per-clip AI enhancement** — Clean Audio (denoise) + Remove Silences DONE (ffmpeg, `POST .../enhance`). Remaining need models/providers: remove-filler, background removal, eye contact, magic cut, green screen, face filter.
3. **Animation/Transition render engine** — Animations DONE (`lib/animation-engine.ts`). Remaining: transition render (boundary crossfades between adjacent clips).
4. **Richer text renderer** — DONE: font/size/color/bold/italic/align now render (`clip.text.*`). Remaining: line-height, letter-spacing, text styles/effects, text-behind-person.
5. **Transform extras** — DONE: Flip (H/V), Round Corners, Fit/Fill, and Order/z-index (via `transform.flipH/flipV/radius/fit/z`). Remaining: filters/effects.
6. **Stock/asset providers** (stock video/image/music/SFX, stickers, shapes, GIFs, characters) -> Elements tab + all "Stock" sections.
7. **Brand Kit service** (save/list assets, fonts, colors) -> Brand Kit tab + every "Save to Brand Kit".
8. **Project actions** (duplicate, save-as-template, version history) -> header menu.
