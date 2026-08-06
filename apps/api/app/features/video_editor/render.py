"""Compile an EditorDoc into an ffmpeg command (filtergraph render — Phase 1b).

v1 scope: composite every visual clip (bottom track → top) onto a black canvas
with per-clip trim, speed, contain-scale, translate and opacity; mix all
audio-lane clips (trim, speed, volume, delay). Text clips burn as bottom-center
caption pills (matching the preview) via ASS; video-embedded audio is skipped.
"""

from __future__ import annotations


def _f(x: float) -> str:
    return f"{float(x):.4f}"


# Transition fade length (seconds) at a clip boundary — capped to half the clip.
_TRANSITION_D = 0.6


def _lane(kind: str) -> str:
    return "audio" if kind == "audio" else "text" if kind == "text" else "visual"


def _ass_time(t: float) -> str:
    cs = max(0, int(round(t * 100)))
    return f"{cs // 360000}:{cs % 360000 // 6000:02d}:{cs % 6000 // 100:02d}.{cs % 100:02d}"


def _ass_color(hex_str: str) -> str:
    """#RRGGBB -> ASS &HBBGGRR& primary-colour override (white on bad input)."""
    s = (hex_str or "").lstrip("#")
    if len(s) != 6:
        return "&HFFFFFF&"
    return f"&H{s[4:6]}{s[2:4]}{s[0:2]}&".upper()


def _ass_font(family: str) -> str:
    """First family in a CSS stack; libass/fontconfig substitutes the closest match."""
    return (family or "").split(",")[0].strip().strip("'\"")


def build_text_ass(doc: dict) -> str | None:
    """ASS document for the doc's text clips. Subtitle-track clips burn as the
    bottom-centered caption pill; every other text clip renders at its own
    position with its own font / size / colour / bold / italic / align / spacing /
    opacity (matching the editor preview). None when there are no text clips.

    ponytail: transform.x/y are treated as doc pixels, same convention as the
    visual-clip renderer below. libass only faithfully renders the bundled fonts
    (Poppins/Anton/Bangers); other families fall back via fontconfig. line-height
    has no ASS equivalent and is skipped.
    """
    from apps.api.app.features.clips.captions import FONT_NAME

    w = int(doc.get("width") or 1080)
    h = int(doc.get("height") or 1920)
    cx, cy = w / 2, h / 2
    cap_events: list[str] = []  # subtitle pills (Cap style)
    txt_events: list[str] = []  # positioned per-clip text (Txt style)
    for track in doc.get("tracks", []):
        if track.get("hidden"):
            continue
        is_sub = track.get("name") == "Subtitles"
        for clip in track.get("clips", []):
            if clip.get("kind") != "text":
                continue
            ts = clip.get("text") or {}
            content = (ts.get("content") or "").strip()
            if not content:
                continue
            start = float(clip.get("start", 0))
            end = start + float(clip.get("duration", 0))
            if end <= start:
                continue
            text = content.replace("{", "").replace("}", "").replace("\n", "\\N")
            if is_sub:
                cap_events.append(f"Dialogue: 0,{_ass_time(start)},{_ass_time(end)},Cap,,0,0,0,,{{\\fad(120,60)}}{text}")
                continue

            tf = clip.get("transform") or {}
            x = round(cx + float(tf.get("x") or 0))
            y = round(cy + float(tf.get("y") or 0))
            align = {"left": 4, "center": 5, "right": 6}.get(ts.get("align") or "center", 5)
            size = max(4, round(float(ts.get("fontSize") or 48)))
            op = max(0.0, min(1.0, float(tf.get("opacity", 1))))
            tags = [
                f"\\an{align}",
                f"\\pos({x},{y})",
                f"\\fs{size}",
                f"\\c{_ass_color(ts.get('color') or '#ffffff')}",
                f"\\b{1 if ts.get('bold') else 0}",
                f"\\i{1 if ts.get('italic') else 0}",
            ]
            fam = _ass_font(ts.get("fontFamily") or "")
            if fam:
                tags.append(f"\\fn{fam}")
            sp = float(ts.get("letterSpacing") or 0)
            if abs(sp) > 0.01:
                tags.append(f"\\fsp{_f(sp)}")
            alpha = round((1 - op) * 255)
            if alpha:
                tags.append(f"\\alpha&H{alpha:02X}&")
            tags.append("\\fad(120,60)")
            txt_events.append(f"Dialogue: 0,{_ass_time(start)},{_ass_time(end)},Txt,,0,0,0,,{{{''.join(tags)}}}{text}")

    if not cap_events and not txt_events:
        return None

    fontsize = round(h * 16 / 400)
    margin_v = round(h * 0.04)
    return (
        "[Script Info]\nScriptType: v4.00+\n"
        f"PlayResX: {w}\nPlayResY: {h}\nWrapStyle: 2\n\n"
        "[V4+ Styles]\n"
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, "
        "Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, "
        "Alignment, MarginL, MarginR, MarginV, Encoding\n"
        f"Style: Cap,{FONT_NAME},{fontsize},&H00FFFFFF,&H00FFFFFF,&H00000000,&H50000000,"
        f"0,0,0,0,100,100,0,0,4,1,0,2,40,40,{margin_v},1\n"
        # Txt: plain fill, no box/outline (per-clip look comes from inline overrides)
        f"Style: Txt,{FONT_NAME},48,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,"
        "0,0,0,0,100,100,0,0,1,0,0,5,0,0,0,1\n\n"
        "[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
        + "\n".join(cap_events + txt_events)
        + "\n"
    )


def doc_duration(doc: dict) -> float:
    end = 0.0
    for t in doc.get("tracks", []):
        for c in t.get("clips", []):
            end = max(end, c.get("start", 0) + c.get("duration", 0))
    return max(end, float(doc.get("duration") or 0), 0.5)


def build_render_args(
    doc: dict, sources: dict[str, dict], ass_path: str | None = None
) -> tuple[list[str], str, list[str], float]:
    """Return (input_args, filter_complex, post_args, total_seconds).

    `sources` maps assetId -> {"path": str, "kind": "image"|"video"|"audio"}.
    Clips whose asset is missing are skipped; text clips burn via `ass_path`.
    """
    w = int(doc.get("width") or 1080)
    h = int(doc.get("height") or 1920)
    fps = int(doc.get("fps") or 30)
    total = doc_duration(doc)

    visual: list[dict] = []  # {clip, src, z}
    audio: list[dict] = []
    for z, track in enumerate(doc.get("tracks", [])):
        if track.get("hidden"):
            continue
        lane = _lane(track.get("kind", "video"))
        for clip in track.get("clips", []):
            src = sources.get(clip.get("assetId") or "")
            if not src:
                continue
            if lane == "audio":
                audio.append({"clip": clip, "src": src})
            elif clip.get("kind") == "text":
                continue  # burned separately via ass_path (build_text_ass)
            else:
                visual.append({"clip": clip, "src": src, "z": z})
    visual.sort(key=lambda v: v["z"])  # stable: lower track first, keeps start order

    # ── inputs (assign a stream index to each rendered clip) ──
    input_args: list[str] = []
    idx = 0
    for item in visual:
        clip, src = item["clip"], item["src"]
        if src["kind"] == "image":
            input_args += [
                "-loop",
                "1",
                "-framerate",
                str(fps),
                "-t",
                _f(clip.get("duration", 1)),
                "-i",
                src["path"],
            ]
        else:
            input_args += ["-i", src["path"]]
        item["idx"] = idx
        idx += 1
    for item in audio:
        input_args += ["-i", item["src"]["path"]]
        item["idx"] = idx
        idx += 1

    # ── filtergraph ──
    # Honour a solid background colour; image backgrounds (asset:*) fall back to black.
    bg = str(doc.get("background") or "#000000")
    base_color = f"0x{bg[1:]}" if len(bg) == 7 and bg.startswith("#") else "black"
    fc: list[str] = [f"color=c={base_color}:s={w}x{h}:r={fps}:d={_f(total)}[base]"]
    prev = "base"
    for n, item in enumerate(visual):
        clip, src, i = item["clip"], item["src"], item["idx"]
        start = float(clip.get("start", 0))
        dur = float(clip.get("duration", 0))
        speed = max(0.1, float(clip.get("speed") or 1))
        tf = clip.get("transform") or {}
        scale = max(0.01, float(tf.get("scale") or 1))
        op = max(0.0, min(1.0, float(tf.get("opacity", 1))))
        tx, ty = float(tf.get("x") or 0), float(tf.get("y") or 0)
        sw, sh = max(2, int(w * scale)), max(2, int(h * scale))

        chain = f"[{i}:v]"
        if src["kind"] == "video":
            chain += f"trim=start={_f(clip.get('in', 0))}:end={_f(clip.get('out', dur))},"
        chain += f"setpts=(PTS-STARTPTS)/{_f(speed)}+{_f(start)}/TB,"
        chain += f"scale={sw}:{sh}:force_original_aspect_ratio=decrease,"
        chain += f"format=rgba,colorchannelmixer=aa={_f(op)}"
        # Transition: alpha fade-in at the clip's start — reads as a crossfade over
        # whatever (lower track / previous clip / background) shows through beneath.
        tr = clip.get("transition")
        if tr and tr != "None":
            td = min(_TRANSITION_D, dur / 2)
            chain += f",fade=t=in:st={_f(start)}:d={_f(td)}:alpha=1"
        chain += f"[v{n}]"
        fc.append(chain)

        x = f"(main_w-overlay_w)/2+{_f(tx)}"
        y = f"(main_h-overlay_h)/2+{_f(ty)}"
        out = f"ov{n}"
        fc.append(
            f"[{prev}][v{n}]overlay=x={x}:y={y}:enable='between(t,{_f(start)},{_f(start + dur)})'[{out}]"
        )
        prev = out
    if ass_path:
        from apps.api.app.features.clips.captions import FONTS_DIR

        fc.append(f"[{prev}]ass={ass_path}:fontsdir={FONTS_DIR}[vtxt]")
        prev = "vtxt"
    vout = prev

    alabels: list[str] = []
    for n, item in enumerate(audio):
        clip, i = item["clip"], item["idx"]
        start = float(clip.get("start", 0))
        speed = max(0.1, float(clip.get("speed") or 1))
        vol = max(0.0, float(clip.get("volume", 1)))
        chain = f"[{i}:a]atrim=start={_f(clip.get('in', 0))}:end={_f(clip.get('out', clip.get('duration', 0)))},asetpts=PTS-STARTPTS,"
        if abs(speed - 1) > 0.01 and 0.5 <= speed <= 2:
            chain += f"atempo={_f(speed)},"
        ms = int(start * 1000)
        chain += f"volume={_f(vol)},adelay={ms}|{ms}[a{n}]"
        fc.append(chain)
        alabels.append(f"[a{n}]")
    if alabels:
        fc.append(
            f"{''.join(alabels)}amix=inputs={len(alabels)}:normalize=0:dropout_transition=0[aout]"
        )

    post = ["-map", f"[{vout}]"]
    if alabels:
        post += ["-map", "[aout]"]
    post += ["-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-r", str(fps)]
    if alabels:
        post += ["-c:a", "aac"]
    post += ["-t", _f(total), "-movflags", "+faststart"]

    return input_args, ";".join(fc), post, total
