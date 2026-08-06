"""Self-check for the Magic B-Roll query extractor. Run: pytest, or `python -m ...test_broll`."""

import os

os.environ.setdefault("DATABASE_URL", "sqlite://")  # router import builds the engine

from apps.api.app.features.video_editor import router as r  # noqa: E402


def test_query_picks_content_words_drops_stopwords():
    q = r._broll_query("So the mountains and the ocean, the mountains and the ocean, and a river")
    parts = set(q.split())
    assert parts == {"mountains", "ocean", "river"}  # top-3 content words by frequency
    assert "the" not in parts and "and" not in parts  # stopwords + short words gone


def test_query_empty_when_no_content():
    assert r._broll_query("the a an is to of") == ""
    assert r._broll_query("") == ""


if __name__ == "__main__":
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            print(f"ok {name}")
    print("all passed")
