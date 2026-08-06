"""Self-check for clip-op dispatch + the Replicate settle loop.
Run: pytest, or `python -m ...test_clip_ops`."""

from apps.api.app.features.video_editor import clip_ops as c


class _NoClient:
    def get(self, *a, **k):  # noqa: ANN002, ANN003
        raise AssertionError("terminal predictions must not be polled")


def test_op_to_clip_kind():
    assert c.clip_kind_for_op("remove_bg_image") == "image"
    assert c.clip_kind_for_op("remove_bg_video") == "video"
    assert c.clip_kind_for_op("eye_contact") == "video"
    assert c.clip_kind_for_op("nonsense") is None
    assert {"remove_bg_image", "remove_bg_video", "eye_contact"} <= set(c.SUPPORTED_OPS)


def test_is_configured_gates_on_model_and_key():
    from apps.api.app.core.config import settings

    # eye_contact has no default model -> needs both the key and eye_contact_model set.
    orig_key, orig_model = settings.replicate_api_key, settings.eye_contact_model
    try:
        settings.replicate_api_key = "k"
        settings.eye_contact_model = ""
        assert c.is_configured("eye_contact") is False  # model unset
        assert c.is_configured("remove_bg_video") is True  # literal model
        settings.eye_contact_model = "owner/gaze"
        assert c.is_configured("eye_contact") is True
        settings.replicate_api_key = ""
        assert c.is_configured("remove_bg_video") is False  # no key
    finally:
        settings.replicate_api_key, settings.eye_contact_model = orig_key, orig_model


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
