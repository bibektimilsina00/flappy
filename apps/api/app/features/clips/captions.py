"""Caption builders for clips: ASS (burned, karaoke word-highlight) + SRT files.

The transcript is segment-level with word timestamps:
  [{"text", "start", "end", "words": [{"w", "s", "e"}]}]
All output times are shifted so the clip's own start is 0.
"""

from __future__ import annotations

import os

FONTS_DIR = os.path.join(os.path.dirname(__file__), "fonts")
FONT_NAME = "Inter"
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


def resolve_style(style: "str | dict | None") -> dict:
    """Preset name or a custom template dict -> ASS parameters."""
    if isinstance(style, dict):
        base = hex_to_ass(str(style.get("color") or "#FFFFFF"))
        return dict(
            size=SIZE_MAP.get(str(style.get("size") or "m"), 16),
            primary=hex_to_ass(str(style.get("highlight") or style.get("color") or "#14B8A6")),
            secondary=base,
            outline_c="&H00000000",
            back="&H60000000" if style.get("box") else "&H00000000",
            bold=1 if style.get("bold", True) else 0,
            border=4 if style.get("box") else 1,
            outline=1 if style.get("box") else 2,
            upper=bool(style.get("uppercase")),
            middle=style.get("position") == "middle",
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


def _lines(segments: list[dict], clip_start: float, clip_end: float) -> list[tuple[float, float, list[dict]]]:
    """Short-form line groups (<= MAX_WORDS_PER_LINE words), times clip-relative."""
    out = []
    for seg in segments:
        words = _words_or_even(seg)
        for i in range(0, len(words), MAX_WORDS_PER_LINE):
            group = words[i : i + MAX_WORDS_PER_LINE]
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
) -> str | None:
    """ASS subtitle document for one clip; None when there's nothing to show.
    `style` is a preset name or a custom template dict.
    `edits` (absolute-time [{start,end,text}]) replaces the transcript slice."""
    segments = edits if edits else _clip_segments(transcript, start, end)
    lines = _lines(segments, start, end)
    if not lines:
        return None

    p = resolve_style(style)
    fontsize = round(height * p["size"] / 400)  # style sizes are per 400px of height
    alignment = 5 if p.get("middle") else 2  # middle-center vs bottom-center
    margin_v = 0 if p.get("middle") else round(height * 0.16)

    header = (
        "[Script Info]\nScriptType: v4.00+\n"
        f"PlayResX: {width}\nPlayResY: {height}\nWrapStyle: 2\n\n"
        "[V4+ Styles]\n"
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, "
        "Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, "
        "Alignment, MarginL, MarginR, MarginV, Encoding\n"
        f"Style: Cap,{FONT_NAME},{fontsize},{p['primary']},{p['secondary']},{p['outline_c']},{p['back']},"
        f"{-1 if p['bold'] else 0},0,0,0,100,100,0,0,{p['border']},{p['outline']},0,{alignment},40,40,{margin_v},1\n\n"
        "[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
    )

    events = []
    for s, e, group in lines:
        parts = []
        for w in group:
            dur_cs = max(1, int(round((w["e"] - w["s"]) * 100)))
            text = str(w["w"]).strip().replace("{", "").replace("}", "").replace("\n", " ")
            if p.get("upper"):
                text = text.upper()
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
