"""Caption builders for clips: ASS (burned, karaoke word-highlight) + SRT files.

The transcript is segment-level with word timestamps:
  [{"text", "start", "end", "words": [{"w", "s", "e"}]}]
All output times are shifted so the clip's own start is 0.
"""

from __future__ import annotations

import os

FONTS_DIR = os.path.join(os.path.dirname(__file__), "fonts")
FONT_NAME = "Poppins"  # static SemiBold; variable fonts render hairline-thin in libass
MAX_WORDS_PER_LINE = 4

def hex_to_ass(color: str) -> str:
    """#RRGGBB -> &H00BBGGRR (ASS colour, opaque)."""
    c = (color or "").lstrip("#")
    if len(c) != 6:
        return "&H00FFFFFF"
    r, g, b = c[0:2], c[2:4], c[4:6]
    return f"&H00{b}{g}{r}".upper()


# Preset caption styles. In karaoke terms: secondary = base colour, primary =
# the active (already-sung) word colour. ASS colors are &HAABBGGRR.
PRESETS: dict[str, dict] = {
    # white text in a soft dark box
    "clean": dict(size=15, primary="&H00FFFFFF", secondary="&H00FFFFFF", outline_c="&H00000000", back="&H60000000", bold=0, border=4, outline=1, upper=False),
    # big bold uppercase white with heavy outline
    "bold": dict(size=19, primary="&H00FFFFFF", secondary="&H00FFFFFF", outline_c="&H00000000", back="&H00000000", bold=1, border=1, outline=3, upper=True),
    # words start white, the active word fills teal
    "highlight": dict(size=17, primary="&H00A6B814", secondary="&H00FFFFFF", outline_c="&H00000000", back="&H00000000", bold=1, border=1, outline=2, upper=False),
    # MrBeast-style: loud uppercase, active word turns yellow
    "beast": dict(size=19, primary=hex_to_ass("#FFD700"), secondary="&H00FFFFFF", outline_c="&H00000000", back="&H00000000", bold=1, border=1, outline=3, upper=True),
    # white text with a teal glow outline
    "neon": dict(size=17, primary="&H00FFFFFF", secondary="&H00FFFFFF", outline_c=hex_to_ass("#14B8A6"), back="&H00000000", bold=1, border=1, outline=2, upper=False),
    # minimal small white, no box
    "mono": dict(size=13, primary="&H00FFFFFF", secondary="&H00FFFFFF", outline_c="&H00000000", back="&H00000000", bold=0, border=1, outline=1, upper=False),
}

SIZE_MAP = {"s": 13, "m": 16, "l": 20}


# "inter" is a legacy alias — the old variable Inter rendered hairline-thin in libass
FONT_ASS = {"inter": "Poppins", "poppins": "Poppins", "anton": "Anton", "bangers": "Bangers"}


def resolve_style(style: "str | dict | None") -> dict:
    """Preset name or a custom template dict -> ASS parameters."""
    if isinstance(style, dict):
        base = hex_to_ass(str(style.get("color") or "#FFFFFF"))
        stroke = style.get("stroke") or {}
        box_color = str(style.get("box_color") or "#000000").lstrip("#")[:6] or "000000"
        bb, gg, rr = box_color[4:6], box_color[2:4], box_color[0:2]
        return dict(
            font=FONT_ASS.get(str(style.get("font") or "inter"), "Inter"),
            size=int(style.get("size_px") or SIZE_MAP.get(str(style.get("size") or "m"), 16)),
            primary=hex_to_ass(str(style.get("highlight") or style.get("color") or "#14B8A6")),
            secondary=base,
            outline_c=hex_to_ass(str(stroke.get("color") or "#000000")),
            back=f"&H60{bb}{gg}{rr}".upper() if style.get("box") else "&H00000000",
            bold=1 if style.get("bold", True) else 0,
            italic=1 if style.get("italic") else 0,
            underline=1 if style.get("underline") else 0,
            spacing=int(style.get("spacing") or 0),
            shadow=2 if style.get("shadow") else 0,
            border=4 if style.get("box") else 1,
            outline=1 if style.get("box") else max(0, min(4, int(stroke.get("width", 2)))),
            upper=bool(style.get("uppercase")),
            middle=style.get("position") == "middle",
            align=str(style.get("align") or "center"),
            words_per_line=max(1, min(8, int(style.get("words_per_line") or 4))),
        )
    return PRESETS.get(str(style or "clean"), PRESETS["clean"])


def _clip_segments(transcript: list[dict], start: float, end: float) -> list[dict]:
    """Segments overlapping [start, end], trimmed to the window."""
    out = []
    for seg in transcript or []:
        if seg["end"] <= start or seg["start"] >= end:
            continue
        words = [w for w in (seg.get("words") or []) if w["e"] > start and w["s"] < end]
        out.append({**seg, "start": max(seg["start"], start), "end": min(seg["end"], end), "words": words})
    return out


def _words_or_even(seg: dict) -> list[dict]:
    """Word timings; if absent (e.g. user-edited text) spread words evenly."""
    words = seg.get("words") or []
    if words:
        return words
    tokens = [t for t in (seg.get("text") or "").split() if t]
    if not tokens:
        return []
    span = (seg["end"] - seg["start"]) / len(tokens)
    return [
        {"w": t, "s": seg["start"] + i * span, "e": seg["start"] + (i + 1) * span}
        for i, t in enumerate(tokens)
    ]


def _lines(segments: list[dict], clip_start: float, clip_end: float, max_words: int = MAX_WORDS_PER_LINE) -> list[tuple[float, float, list[dict]]]:
    """Short-form line groups (<= MAX_WORDS_PER_LINE words), times clip-relative."""
    out = []
    for seg in segments:
        words = _words_or_even(seg)
        for i in range(0, len(words), max_words):
            group = words[i : i + max_words]
            s = max(0.0, group[0]["s"] - clip_start)
            e = min(clip_end - clip_start, group[-1]["e"] - clip_start)
            if e <= s:
                continue
            out.append((s, e, group))
    return out


def _ass_time(t: float) -> str:
    cs = max(0, int(round(t * 100)))
    return f"{cs // 360000}:{cs % 360000 // 6000:02d}:{cs % 6000 // 100:02d}.{cs % 100:02d}"


def build_ass(
    transcript: list[dict],
    start: float,
    end: float,
    style: "str | dict",
    width: int,
    height: int,
    edits: list[dict] | None = None,
    headline_text: str | None = None,
    headline_cfg: dict | None = None,
) -> str | None:
    """ASS subtitle document for one clip; None when there's nothing to show.
    `style` is a preset name or a custom template dict. A custom dict with
    headline.enabled burns `headline_text` as a top banner for the whole clip.
    `edits` (absolute-time [{start,end,text}]) replaces the transcript slice."""
    p = resolve_style(style)
    sub_enabled = not (isinstance(style, dict) and style.get("subtitles") is False)
    segments = (edits if edits else _clip_segments(transcript, start, end)) if sub_enabled else []
    lines = _lines(segments, start, end, p.get("words_per_line", MAX_WORDS_PER_LINE)) if sub_enabled else []
    headline = (style.get("headline") if isinstance(style, dict) else None) or headline_cfg or {}
    show_headline = bool(headline.get("enabled")) and bool((headline_text or "").strip())
    if not lines and not show_headline:
        return None

    fontsize = round(height * p["size"] / 400)  # style sizes are per 400px of height
    align_base = {"left": 1, "center": 2, "right": 3}.get(p.get("align", "center"), 2)
    alignment = align_base + 3 if p.get("middle") else align_base  # middle row vs bottom row
    margin_v = 0 if p.get("middle") else round(height * 0.16)

    header = (
        "[Script Info]\nScriptType: v4.00+\n"
        f"PlayResX: {width}\nPlayResY: {height}\nWrapStyle: 2\n\n"
        "[V4+ Styles]\n"
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, "
        "Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, "
        "Alignment, MarginL, MarginR, MarginV, Encoding\n"
        f"Style: Cap,{p.get('font', FONT_NAME)},{fontsize},{p['primary']},{p['secondary']},{p['outline_c']},{p['back']},"
        f"{-1 if p['bold'] else 0},{-1 if p.get('italic') else 0},{-1 if p.get('underline') else 0},0,100,100,"
        f"{p.get('spacing', 0)},0,{p['border']},{p['outline']},{p.get('shadow', 0)},{alignment},40,40,{margin_v},1\n"
    )
    if show_headline:
        head_size = round(height * 15 / 400)
        head_fg = hex_to_ass(str(headline.get("color") or "#000000"))
        bg_raw = headline.get("bg") or "#FFFFFF"
        if bg_raw == "none":
            # outlined text, no box (e.g. yellow headline variant)
            header += (
                f"Style: Head,{FONT_NAME},{head_size},{head_fg},{head_fg},&H00000000,&H00000000,"
                f"-1,0,0,0,100,100,0,0,1,3,0,8,60,60,{round(height * 0.06)},1\n"
            )
        else:
            head_bg = hex_to_ass(str(bg_raw))
            # BorderStyle 4 = opaque box behind the line; alignment 8 = top-center.
            header += (
                f"Style: Head,{FONT_NAME},{head_size},{head_fg},{head_fg},{head_bg},{head_bg},"
                f"-1,0,0,0,100,100,0,0,4,3,0,8,60,60,{round(height * 0.06)},1\n"
            )
    header += "\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"

    events = []
    if show_headline:
        text = str(headline_text).strip().upper().replace("{", "").replace("}", "").replace("\n", " ")
        events.append(f"Dialogue: 0,{_ass_time(0)},{_ass_time(max(0.5, end - start))},Head,,0,0,0,,{text}")
    for s, e, group in lines:
        parts = []
        for w in group:
            dur_cs = max(1, int(round((w["e"] - w["s"]) * 100)))
            text = str(w["w"]).strip().replace("{", "").replace("}", "").replace("\n", " ")
            if p.get("upper"):
                text = text.upper()
            if w.get("hl"):
                # keyword highlight: force the accent colour in both karaoke states
                parts.append(f"{{\\1c{p['primary']}&\\2c{p['primary']}&}}{{\\k{dur_cs}}}{text}{{\\r}}")
            else:
                parts.append(f"{{\\k{dur_cs}}}{text}")
        # \fad: quick fade-in/out per line — subtle motion that reads as "animated".
        events.append(f"Dialogue: 0,{_ass_time(s)},{_ass_time(e)},Cap,,0,0,0,,{{\\fad(120,60)}}{' '.join(parts)}")
    return header + "\n".join(events) + "\n"


def _srt_time(t: float) -> str:
    ms = max(0, int(round(t * 1000)))
    return f"{ms // 3600000:02d}:{ms % 3600000 // 60000:02d}:{ms % 60000 // 1000:02d},{ms % 1000:03d}"


def build_srt(transcript: list[dict], start: float, end: float, edits: list[dict] | None = None) -> str | None:
    """SRT for one clip (segment-level cues, clip-relative times)."""
    segments = edits if edits else _clip_segments(transcript, start, end)
    if not segments:
        return None
    blocks = []
    for i, seg in enumerate(segments):
        s = max(0.0, seg["start"] - start)
        e = max(s, min(end, seg["end"]) - start)
        text = (seg.get("text") or "").strip()
        if not text:
            continue
        blocks.append(f"{i + 1}\n{_srt_time(s)} --> {_srt_time(e)}\n{text}")
    return "\n\n".join(blocks) + "\n" if blocks else None
