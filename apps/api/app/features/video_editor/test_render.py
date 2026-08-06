"""Self-check for the text-ASS renderer. Run: pytest, or `python -m ...test_render`."""

from apps.api.app.features.video_editor import render as r


def test_ass_color_bgr_order():
    assert r._ass_color("#14b8a6") == "&HA6B814&"  # RRGGBB -> BBGGRR
    assert r._ass_color("bad") == "&HFFFFFF&"  # fallback white


def test_ass_font_takes_first_family():
    assert r._ass_font("Georgia, serif") == "Georgia"
    assert r._ass_font("'Comic Sans MS', cursive") == "Comic Sans MS"


def _doc(track_name, text):
    return {
        "width": 1080,
        "height": 1920,
        "tracks": [{"name": track_name, "clips": [{"kind": "text", "start": 0, "duration": 2, "transform": {"x": 100, "y": -50}, "text": text}]}],
    }


def test_subtitle_uses_cap_pill():
    ass = r.build_text_ass(_doc("Subtitles", {"content": "hello"}))
    assert ",Cap," in ass and ",Txt," not in ass


def test_regular_text_is_positioned_and_styled():
    ass = r.build_text_ass(_doc("Text 1", {"content": "hi", "fontSize": 72, "color": "#ff0000", "bold": True, "align": "left"}))
    assert ",Txt," in ass and ",Cap," not in ass
    assert "\\pos(640,910)" in ass  # 1080/2+100, 1920/2-50
    assert "\\fs72" in ass and "\\c&H0000FF&" in ass and "\\b1" in ass and "\\an4" in ass


def test_no_text_returns_none():
    assert r.build_text_ass({"tracks": [{"clips": [{"kind": "image"}]}]}) is None


if __name__ == "__main__":
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            print(f"ok {name}")
    print("all passed")
