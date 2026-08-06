"use client";

import { changeDuration, moveClip, updateClip, updateTransform } from "../../../lib/doc-ops";
import { clipTimingSchema, clipTransformSchema } from "../../../schemas/editor-schemas";
import type { Clip, VideoEditorDoc } from "../../../types";

export function useInspector({
  clip,
  doc,
  startGesture,
  preview,
  endGesture,
}: {
  clip: Clip;
  doc: VideoEditorDoc;
  startGesture: () => void;
  preview: (d: VideoEditorDoc) => void;
  endGesture: (changed?: boolean) => void;
}) {
  const media = clip.kind === "video" || clip.kind === "audio";
  const visual = clip.kind !== "audio";

  const gestureProps = {
    onPointerDown: startGesture,
    onFocus: startGesture,
    onBlur: () => endGesture(true),
    onPointerUp: () => endGesture(true),
  };

  const updateText = (content: string) => {
    preview(updateClip(doc, clip.id, { text: { ...(clip.text ?? {}), content } }));
  };

  const updateStart = (val: number) => {
    const parsed = clipTimingSchema.pick({ start: true }).safeParse({ start: val });
    if (parsed.success) {
      preview(moveClip(doc, clip.id, parsed.data.start));
    }
  };

  const updateDuration = (val: number) => {
    const parsed = clipTimingSchema.pick({ duration: true }).safeParse({ duration: val });
    if (parsed.success) {
      preview(changeDuration(doc, clip.id, parsed.data.duration));
    }
  };

  const updateSpeed = (val: number) => {
    const parsed = clipTimingSchema.pick({ speed: true }).safeParse({ speed: val });
    if (parsed.success) {
      const speed = parsed.data.speed;
      preview(updateClip(doc, clip.id, { speed, duration: (clip.out - clip.in) / speed }));
    }
  };

  const updateX = (x: number) => {
    const parsed = clipTransformSchema.pick({ x: true }).safeParse({ x });
    if (parsed.success) preview(updateTransform(doc, clip.id, { x: parsed.data.x }));
  };

  const updateY = (y: number) => {
    const parsed = clipTransformSchema.pick({ y: true }).safeParse({ y });
    if (parsed.success) preview(updateTransform(doc, clip.id, { y: parsed.data.y }));
  };

  const updateScale = (scale: number) => {
    const parsed = clipTransformSchema.pick({ scale: true }).safeParse({ scale });
    if (parsed.success) preview(updateTransform(doc, clip.id, { scale: parsed.data.scale }));
  };

  const updateOpacity = (opacity: number) => {
    const parsed = clipTransformSchema.pick({ opacity: true }).safeParse({ opacity });
    if (parsed.success) preview(updateTransform(doc, clip.id, { opacity: parsed.data.opacity }));
  };

  const updateVolume = (volume: number) => {
    const vol = Math.max(0, Math.min(1, volume));
    preview(updateClip(doc, clip.id, { volume: vol }));
  };

  return {
    media,
    visual,
    gestureProps,
    updateText,
    updateStart,
    updateDuration,
    updateSpeed,
    updateX,
    updateY,
    updateScale,
    updateOpacity,
    updateVolume,
  };
}
