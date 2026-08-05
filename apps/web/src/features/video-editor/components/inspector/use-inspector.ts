"use client";

import { changeDuration, moveClip, updateClip, updateTransform } from "../../lib/doc-ops";
import type { Clip, VideoEditorDoc } from "../../types";

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
    preview(moveClip(doc, clip.id, Math.max(0, val)));
  };

  const updateDuration = (val: number) => {
    preview(changeDuration(doc, clip.id, Math.max(0.1, val)));
  };

  const updateSpeed = (val: number) => {
    const speed = Math.max(0.25, val);
    preview(updateClip(doc, clip.id, { speed, duration: (clip.out - clip.in) / speed }));
  };

  const updateX = (x: number) => {
    preview(updateTransform(doc, clip.id, { x }));
  };

  const updateY = (y: number) => {
    preview(updateTransform(doc, clip.id, { y }));
  };

  const updateScale = (scale: number) => {
    preview(updateTransform(doc, clip.id, { scale }));
  };

  const updateOpacity = (opacity: number) => {
    preview(updateTransform(doc, clip.id, { opacity }));
  };

  const updateVolume = (volume: number) => {
    preview(updateClip(doc, clip.id, { volume }));
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
