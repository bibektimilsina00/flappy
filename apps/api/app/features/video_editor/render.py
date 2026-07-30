"""Compile an EditorDoc into an ffmpeg command (filtergraph render — Phase 1b).

v1 scope: composite every visual clip (bottom track → top) onto a black canvas
with per-clip trim, speed, contain-scale, translate and opacity; mix all
audio-lane clips (trim, speed, volume, delay). Text clips burn as bottom-center
caption pills (matching the preview) via ASS; video-embedded audio is skipped.
"""

from __future__ import annotations


def _f(x: float) -> str:
    return f"{float(x):.4f}"


def _lane(kind: str) -> str:
    return "audio" if kind == "audio" else "text" if kind == "text" else "visual"


def _ass_time(t: float) -> str:
    cs = max(0, int(round(t * 100)))
    return f"{cs // 360000}:{cs % 360000 // 6000:02d}:{cs % 6000 // 100:02d}.{cs % 100:02d}"


def build_text_ass(doc: dict) -> str | None:
    """ASS document for the doc's text clips — bottom-centered boxed pills,
    matching the editor preview. None when there are no text clips."""
    from apps.api.app.features.clips.captions import FONT_NAME

    w = int(doc.get("width") or 1080)
    h = int(doc.get("height") or 1920)
    events = []
    for track in doc.get("tracks", []):
        if track.get("hidden"):
            continue
        for clip in track.get("clips", []):
            content = ((clip.get("text") or {}).get("content") or "").strip()
            if clip.get("kind") != "text" or not content:
                continue
            start = float(clip.get("start", 0))
            end = start + float(clip.get("duration", 0))
            if end <= start:
                continue
            text = content.replace("{", "").replace("}", "").replace("\n", "\\N")
            events.append(
                f"Dialogue: 0,{_ass_time(start)},{_ass_time(end)},Cap,,0,0,0,,{{\\fad(120,60)}}{text}"
            )
    if not events:
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
        f"0,0,0,0,100,100,0,0,4,1,0,2,40,40,{margin_v},1\n\n"
        "[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
        + "\n".join(events)
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
    fc: list[str] = [f"color=c=black:s={w}x{h}:r={fps}:d={_f(total)}[base]"]
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
        chain += f"format=rgba,colorchannelmixer=aa={_f(op)}[v{n}]"
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
