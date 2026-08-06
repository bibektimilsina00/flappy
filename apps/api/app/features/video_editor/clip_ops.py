"""Per-clip media operations backed by Replicate.

Two entry modes share `run_op`:
  - fast ops (image matting) run inline in the request (router)
  - slow ops (video matting) run on the worker via the async execution path

`run_op(storage, op, src_key, workspace_id) -> (new_key, kind)` is the whole
contract; the worker task and the router are thin wrappers around it.
"""

import base64
import time
import uuid

# op -> replicate model (literal, or `model_setting` naming a settings field for
# ops with no obvious default), input field, output ext/mime, clip kind consumed.
_OPS = {
    "remove_bg_image": {"model": "851-labs/background-remover", "field": "image", "ext": "png", "mime": "image/png", "kind": "image"},
    "remove_bg_video": {"model": "arielreplicate/robust_video_matting", "field": "input_video", "ext": "mp4", "mime": "video/mp4", "kind": "video"},
    # No canonical Replicate gaze-correction model — operator supplies one via settings.
    "eye_contact": {"model_setting": "eye_contact_model", "field": "input_video", "ext": "mp4", "mime": "video/mp4", "kind": "video"},
    # Face touch-up — likewise operator-supplied (model must accept an `input_video` field).
    "face_filter": {"model_setting": "face_filter_model", "field": "input_video", "ext": "mp4", "mime": "video/mp4", "kind": "video"},
}
SUPPORTED_OPS = frozenset(_OPS)
_TERMINAL = {"succeeded", "failed", "canceled"}


def clip_kind_for_op(op: str) -> str | None:
    """The clip kind `op` consumes, so callers can validate before dispatch."""
    spec = _OPS.get(op)
    return spec["kind"] if spec else None


def _model_for(op: str, settings) -> str:
    spec = _OPS.get(op) or {}
    return spec.get("model") or getattr(settings, spec.get("model_setting", ""), "") or ""


def is_configured(op: str) -> bool:
    """True when `op` can actually run (Replicate key + a resolved model). Lets the
    endpoint 501 up front instead of dispatching a job that will just fail."""
    from apps.api.app.core.config import settings

    return op in _OPS and bool(settings.replicate_api_key) and bool(_model_for(op, settings))


def settle_prediction(client, headers: dict, pred: dict, timeout_s: float = 90.0) -> dict:
    """Poll a Replicate prediction to a terminal state (Prefer:wait may return it
    already). Blocks the caller — sync ops keep timeout_s small; the worker uses more."""
    deadline = time.monotonic() + timeout_s
    while pred.get("status") not in _TERMINAL:
        if time.monotonic() > deadline:
            raise TimeoutError("prediction timed out")
        time.sleep(3)
        r = client.get(f"https://api.replicate.com/v1/predictions/{pred['id']}", headers=headers)
        r.raise_for_status()
        pred = r.json()
    if pred.get("status") != "succeeded":
        raise RuntimeError(str(pred.get("error") or pred.get("status")))
    return pred


def run_op(storage, op: str, src_key: str, workspace_id, timeout_s: float = 90.0) -> tuple[str, str]:
    """Run a matting op on the stored source and return (new_key, kind). Raises on
    failure. `timeout_s` bounds the Replicate poll (video callers pass minutes)."""
    import httpx

    from apps.api.app.core.config import settings

    spec = _OPS.get(op)
    if spec is None:
        raise ValueError(f"unsupported op: {op}")
    model = _model_for(op, settings)
    if not settings.replicate_api_key or not model:
        raise RuntimeError("This effect is not configured")

    src_bytes = storage.get(src_key)
    data_uri = f"data:{spec['mime']};base64,{base64.b64encode(src_bytes).decode()}"
    headers = {"Authorization": f"Bearer {settings.replicate_api_key}"}
    with httpx.Client(timeout=120) as client:
        res = client.post(
            f"https://api.replicate.com/v1/models/{model}/predictions",
            headers={**headers, "Prefer": "wait=60"},
            json={"input": {spec["field"]: data_uri}},
        )
        res.raise_for_status()
        pred = settle_prediction(client, headers, res.json(), timeout_s)
        output = pred.get("output")
        url = output[0] if isinstance(output, list) else output
        if not isinstance(url, str):
            raise RuntimeError("no media output")
        out_bytes = client.get(url).content

    key = f"{workspace_id}/edits/{uuid.uuid4()}.{spec['ext']}"
    storage.put(key, out_bytes, spec["mime"])
    return key, spec["kind"]
