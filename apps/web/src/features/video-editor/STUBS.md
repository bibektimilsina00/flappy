# Video Editor — UI Stubs & Wiring Status

Tracks controls that exist in the editor UI but are **not yet functional** (visual only), so we know what's left to wire to real logic/back-ends. Each section lists **Stub** (does nothing / local-state only) vs **Works** (wired to the doc/undo-redo or a real service).

Legend: `[ ]` stub to implement · `[x]` functional today.

---

## Left panel

### AI Tools (`left-panel/ai-tools-panel.tsx`)
- [ ] Gen tiles: **AI Transitions**, **AI Voice**, **AI Dubbing** — marked "Soon", no action
- [ ] Enhance toggles (local state only, no effect): **Clean audio**, **Remove filler words**, **Remove silences**, **Eye contact**, **AI Background expand**, **Remove background**, **Face filter**, **Green screen**, **Subtitles**
- [x] **AI Video / AI Image / B-roll / Characters** tiles → open AI Playground on the right generator
- [x] **Generate with AI** → Assistant/GenPanel flow (uses `use-generation`; verify end-to-end)

### AI Playground modal (`ai-playground/ai-playground.tsx`)
- [ ] Upload tile, **AI model** / aspect / duration chips — visual
- [ ] **Generate** button — no generation call
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
- [x] **AI voice** → opens TTS panel, **Upload**, Asset Library rows drag to timeline

### Add Text-to-Speech (`left-panel/add-tts.tsx`)
- [ ] Language selector, **Actors / Voice Clone** tabs, actor picker, **Generate voice** — all visual
- [x] Prompt textarea

### Image tab (`left-panel/image-tab.tsx`)
- [ ] **Generate B-roll images** (upgrade)
- [ ] **Stock Images**, **Backgrounds**, **GIFs** — tiles don't add to timeline; chips cosmetic
- [x] **Generate** (opens playground), **Upload**, **Asset Library** tiles drag to timeline

### Text tab (`left-panel/text-tab.tsx`)
- [ ] Presets add a text clip with the label text only — **the tile's font/style is not applied** (see Text inspector)
- [ ] **View all** links
- [x] Clicking a preset adds a text clip

### Subtitles tab (`left-panel/subtitles-tab.tsx`)
- [ ] Source & language dropdowns (both views) — no options, no selection
- [ ] **Auto-subtitle in English**, **Upload Subtitles File** — no transcription/import back-end
- [ ] **Transcribe Manually** → opens the manual sub-view (source + language + **Add Subtitles**); **Add Subtitles** creates nothing (no subtitle track)
- [x] Add translation / Detect Speakers toggles hold local state; Transcribe Manually ↔ back navigation works

### Elements tab (`left-panel/elements-tab.tsx`)
- [ ] **Everything** — Stickers/emoji, Animated Stickers, Shapes, Visualizers do not add to the canvas
- [ ] Category chips, **View all** links

### Brand Kit tab (`left-panel/brand-kit-tab.tsx`)
- [ ] **Entire tab** is empty-state — search, workspace picker, upload, tag filters, all "No …" sections; no save/load back-end

---

## Clip inspector (`inspector/inspector.tsx`)

### Video clip
- [ ] Edit with Script, **Replace**, **Animations** / **Adjust** tiles, **Fade Audio**, **Round Corners**, **Flip H/V**, **Detach Audio**
- [ ] **AI Tools** list (11 items: Clean Audio, Eye Contact, Remove Background, Remove Silences, Remove Filler Words, AI Background Expand, Magic B-Roll, AI Transitions, Face Filter, Magic Cut, Green Screen)
- [x] **Speed**, **Volume**, **Opacity**, **Rotation** (value), **Start/End**, **Delete**

### Audio clip
- [ ] **Replace**, **Fade In/Out**, **AI Tools** (Clean Audio, Magic Cut, Remove Silences)
- [x] **Mute/Unmute**, **Speed**, **Volume**, **Start/End**, **Delete**

### Image clip
- [ ] **Generate Video**, **Replace**, **Animations** / **Adjust** tiles, **Round Corners**, **Flip H/V**
- [x] **Opacity**, **Rotation**, **Start/End**, **Delete**

### Text clip
- [ ] Font family, font size, **color**, **Bold/Italic**, **alignment**, spacing, **Styles**, **Animations**, **Text Behind Person** — none are drawn (preview renders text as a fixed caption pill; styles are toggles/local state only)
- [x] Text **content**, **Start/End**, **Delete**, **Add Another Text Box**

---

## Floating clip toolbar (`clip-toolbar/clip-toolbar.tsx`)

- [ ] **Video**: `⋯` menu — Flip, Fit/Fill, Round Corners, Filters, Effects, Adjust, Order, Adjust Timing, Replace Video, Detach Audio, Save to Brand Kit
- [ ] **Audio**: `⋯` — Adjust Timing, Replace Audio, Save to Brand Kit
- [ ] **Image**: Adjust; `⋯` — Flip, Fit/Fill, Round Corners, Order, Adjust Timing, Replace Image, Save to Brand Kit
- [ ] **Text**: color / font / size / Effect / Animation / Depth; `⋯` — Bold/Italic, align, Line Height, Letter Spacing, Order, Save to Brand Kit, Properties, Adjust Timing
- [x] **Volume**, **Speed** popovers; **Opacity** slider; **Copy** (duplicate); **Delete**; Animation/Transitions open their panels; image **Generate Video** opens the playground

---

## Animations & Transitions panels

### Animations (`animations-panel/animations-panel.tsx`)
- [ ] Presets **do not render at playback** — In/Out/Loop/Zoom selection is stored on the clip (`clip.animations`) but there is no animation engine
- [x] Selection persists on the clip and shows as active

### Transitions (`transitions-panel/transitions-panel.tsx`)
- [ ] Presets don't render (`clip.transition` stored, no engine)
- [ ] **Create new AI Transition** form — Start/End video pickers, prompt, **Generate (50)** — all visual
- [x] Selection persists on the clip

---

## Preview & chrome

### Preview control bar (nothing selected) (`preview/preview.tsx`)
- [ ] **Settings** button
- [ ] Background → **Image** tab ("coming soon")
- [x] **Aspect ratio** picker (+ platform overlays), **Background color** picker, on-canvas move/resize/snap

### Top header (`pages/video-editor-page.tsx`)
- [ ] `⋯` project menu — **Duplicate Project**, **Save as Template**, **Version History**
- [x] Cloud save indicator, title edit, **Undo/Redo**, **Export & Publish**

---

## Notes / dependencies

Most stubs fall into a few buckets — implementing the bucket unlocks many rows at once:

1. **Generation back-end** (text→image/video, TTS, dubbing, AI transitions, characters) → AI Playground, Add-TTS, most AI Tools tiles, Generate buttons.
2. **Per-clip AI enhancement service** (clean audio, remove silences/filler, background removal, eye contact, magic cut, green screen, face filter) → all inspector "AI Tools" lists + Enhance toggles.
3. **Animation/Transition render engine** → Animations & Transitions panels (data already persisted).
4. **Richer text renderer** (honor `clip.text` font/size/color/weight/align in the preview) → entire Text inspector styling + text floating toolbar.
5. **Transform extras** (`scaleX`/`scaleY` for flip, corner radius, filters/effects, z-order) → Flip, Round Corners, Filters, Effects, Order across inspectors & `⋯` menus.
6. **Stock/asset providers** (stock video/image/music/SFX, stickers, shapes, GIFs, characters) → Elements tab + all "Stock" sections.
7. **Brand Kit service** (save/list assets, fonts, colors) → Brand Kit tab + every "Save to Brand Kit".
8. **Project actions** (duplicate, save-as-template, version history) → header `⋯` menu.
