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

# name -> (Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, BorderStyle, Outline)
# ASS colors are &HAABBGGRR (alpha 00 = opaque).
STYLES = {
    # white text in a soft dark box
    "clean": (15, "&H00FFFFFF", "&H00FFFFFF", "&H00000000", "&H60000000", 0, 4, 1),
    # big bold white with heavy outline
    "bold": (19, "&H00FFFFFF", "&H00FFFFFF", "&H00000000", "&H00000000", 1, 1, 3),
    # karaoke: words start white, the active word fills teal
    "highlight": (17, "&H00A6B814", "&H00FFFFFF", "&H00000000", "&H00000000", 1, 1, 2),
}


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
    style: str,
    width: int,
    height: int,
    edits: list[dict] | None = None,
) -> str | None:
    """ASS subtitle document for one clip; None when there's nothing to show.
    `edits` (absolute-time [{start,end,text}]) replaces the transcript slice."""
    segments = edits if edits else _clip_segments(transcript, start, end)
    lines = _lines(segments, start, end)
    if not lines:
        return None

    size, primary, secondary, outline_c, back, bold, border_style, outline = STYLES.get(style) or STYLES["clean"]
    fontsize = round(height * size / 400)  # style sizes are per 400px of height
    margin_v = round(height * 0.16)

    header = (
        "[Script Info]\nScriptType: v4.00+\n"
        f"PlayResX: {width}\nPlayResY: {height}\nWrapStyle: 2\n\n"
        "[V4+ Styles]\n"
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, "
        "Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, "
        "Alignment, MarginL, MarginR, MarginV, Encoding\n"
        f"Style: Cap,{FONT_NAME},{fontsize},{primary},{secondary},{outline_c},{back},"
        f"{-1 if bold else 0},0,0,0,100,100,0,0,{border_style},{outline},0,2,40,40,{margin_v},1\n\n"
        "[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
    )

    events = []
    for s, e, group in lines:
        parts = []
        for w in group:
            dur_cs = max(1, int(round((w["e"] - w["s"]) * 100)))
            text = str(w["w"]).strip().replace("{", "").replace("}", "").replace("\n", " ")
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
