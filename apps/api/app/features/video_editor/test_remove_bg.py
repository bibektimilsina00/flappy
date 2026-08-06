"""Self-check for the Replicate settle helper. Run: pytest, or `python -m ...test_remove_bg`."""

import os

os.environ.setdefault("DATABASE_URL", "sqlite://")  # router import builds the engine

from apps.api.app.features.video_editor import router as r  # noqa: E402


class _NoClient:
    """Fails if polled — proves terminal predictions short-circuit without a GET."""

    def get(self, *a, **k):  # noqa: ANN002, ANN003
        raise AssertionError("should not poll a terminal prediction")


def test_already_succeeded_returns_without_polling():
    pred = {"status": "succeeded", "output": "https://x/out.png"}
    assert r._settle_replicate(_NoClient(), {}, pred) is pred


def test_failed_raises():
    try:
        r._settle_replicate(_NoClient(), {}, {"status": "failed", "error": "boom"})
        raise AssertionError("expected RuntimeError")
    except RuntimeError as e:
        assert "boom" in str(e)


def test_img_mime_defaults_to_png():
    assert r._IMG_MIME.get(".jpeg") == "image/jpeg"
    assert r._IMG_MIME.get(".gif") is None  # -> caller falls back to image/png


if __name__ == "__main__":
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            print(f"ok {name}")
    print("all passed")
