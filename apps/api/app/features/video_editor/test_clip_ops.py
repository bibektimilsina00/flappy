"""Self-check for clip-op dispatch + the Replicate settle loop.
Run: pytest, or `python -m ...test_clip_ops`."""

from apps.api.app.features.video_editor import clip_ops as c


class _NoClient:
    def get(self, *a, **k):  # noqa: ANN002, ANN003
        raise AssertionError("terminal predictions must not be polled")


def test_op_to_clip_kind():
    assert c.clip_kind_for_op("remove_bg_image") == "image"
    assert c.clip_kind_for_op("remove_bg_video") == "video"
    assert c.clip_kind_for_op("nonsense") is None
    assert {"remove_bg_image", "remove_bg_video"} <= set(c.SUPPORTED_OPS)


def test_settle_already_succeeded_short_circuits():
    pred = {"status": "succeeded", "output": "https://x/out.mp4"}
    assert c.settle_prediction(_NoClient(), {}, pred) is pred


def test_settle_failed_raises_with_reason():
    try:
        c.settle_prediction(_NoClient(), {}, {"status": "failed", "error": "gpu oom"})
        raise AssertionError("expected RuntimeError")
    except RuntimeError as e:
        assert "gpu oom" in str(e)


def test_run_op_rejects_unknown():
    try:
        c.run_op(None, "bogus", "k", "ws")
        raise AssertionError("expected ValueError")
    except ValueError:
        pass


if __name__ == "__main__":
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            print(f"ok {name}")
    print("all passed")
