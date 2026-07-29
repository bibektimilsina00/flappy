"""Face-aware framing: pick the horizontal crop center for a clip.

Samples a few frames across the clip, detects faces with OpenCV's YuNet
detector (bundled ONNX, ~230 KB, Apache-2.0), and returns the median
face-center as a 0..1 fraction of frame width. None means "no confident
face" -> caller uses a center crop.

# ponytail: one static crop per clip from sampled frames; true per-frame
# speaker tracking (moving crop window) is the upgrade path if users film
# walk-and-talk content.
"""

from __future__ import annotations

import logging
import os
import statistics
import subprocess
import tempfile

import imageio_ffmpeg

log = logging.getLogger(__name__)

YUNET_PATH = os.path.join(os.path.dirname(__file__), "models_data", "yunet.onnx")
SAMPLES = 5
MIN_HITS = 2  # frames that must contain a face before we trust the signal
MIN_SCORE = 0.7

_detector = None  # created once per worker process


def _get_detector():
    global _detector
    if _detector is None:
        import cv2

        if not os.path.exists(YUNET_PATH):
            return None
        _detector = cv2.FaceDetectorYN_create(YUNET_PATH, "", (320, 320), MIN_SCORE)
    return _detector


def face_center_fraction(source: str, start: float, end: float) -> float | None:
    try:
        import cv2
    except ImportError:  # pragma: no cover - optional dep missing
        return None
    detector = _get_detector()
    if detector is None:
        return None

    exe = imageio_ffmpeg.get_ffmpeg_exe()
    span = max(0.1, end - start)
    centers: list[float] = []
    with tempfile.TemporaryDirectory() as d:
        for i in range(SAMPLES):
            t = start + span * (i + 0.5) / SAMPLES
            frame = os.path.join(d, f"f{i}.jpg")
            proc = subprocess.run(
                [exe, "-y", "-ss", f"{t:.2f}", "-i", source, "-frames:v", "1", "-q:v", "4", frame],
                capture_output=True,
                timeout=60,
            )
            if proc.returncode != 0 or not os.path.exists(frame):
                continue
            img = cv2.imread(frame)
            if img is None:
                continue
            h, w = img.shape[:2]
            detector.setInputSize((w, h))
            _rv, faces = detector.detect(img)
            if faces is None or len(faces) == 0:
                continue
            # Largest face = the speaker. Row: [x, y, w, h, ...landmarks, score]
            fx, _fy, fw, _fh = max(faces, key=lambda f: f[2] * f[3])[:4]
            centers.append(float(fx + fw / 2) / w)

    if len(centers) < MIN_HITS:
        return None
    center = min(1.0, max(0.0, statistics.median(centers)))
    log.info("framing: face center %.2f from %d/%d sampled frames", center, len(centers), SAMPLES)
    return center
