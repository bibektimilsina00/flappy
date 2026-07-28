"""Compile an EditorDoc into an ffmpeg command (filtergraph render — Phase 1b).

v1 scope: composite every visual clip (bottom track → top) onto a black canvas
with per-clip trim, speed, contain-scale, translate and opacity; mix all
audio-lane clips (trim, speed, volume, delay). Text clips and video-embedded
audio are skipped — see ceilings below.
"""

from __future__ import annotations


def _f(x: float) -> str:
    return f"{float(x):.4f}"


def _lane(kind: str) -> str:
    return "audio" if kind == "audio" else "text" if kind == "text" else "visual"


def doc_duration(doc: dict) -> float:
    end = 0.0
    for t in doc.get("tracks", []):
        for c in t.get("clips", []):
            end = max(end, c.get("start", 0) + c.get("duration", 0))
    return max(end, float(doc.get("duration") or 0), 0.5)


def build_render_args(doc: dict, sources: dict[str, dict]) -> tuple[list[str], str, list[str], float]:
    """Return (input_args, filter_complex, post_args, total_seconds).

    `sources` maps assetId -> {"path": str, "kind": "image"|"video"|"audio"}.
    Clips whose asset is missing (or text clips) are skipped.
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
                continue  # ponytail: text render needs a bundled font → Phase 2
            else:
                visual.append({"clip": clip, "src": src, "z": z})
    visual.sort(key=lambda v: v["z"])  # stable: lower track first, keeps start order

    # ── inputs (assign a stream index to each rendered clip) ──
    input_args: list[str] = []
    idx = 0
    for item in visual:
        clip, src = item["clip"], item["src"]
        if src["kind"] == "image":
            input_args += ["-loop", "1", "-framerate", str(fps), "-t", _f(clip.get("duration", 1)), "-i", src["path"]]
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
        fc.append(f"[{prev}][v{n}]overlay=x={x}:y={y}:enable='between(t,{_f(start)},{_f(start + dur)})'[{out}]")
        prev = out
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
        fc.append(f"{''.join(alabels)}amix=inputs={len(alabels)}:normalize=0:dropout_transition=0[aout]")

    post = ["-map", f"[{vout}]"]
    if alabels:
        post += ["-map", "[aout]"]
    post += ["-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-r", str(fps)]
    if alabels:
        post += ["-c:a", "aac"]
    post += ["-t", _f(total), "-movflags", "+faststart"]

    return input_args, ";".join(fc), post, total
