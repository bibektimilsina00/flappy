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
    preview(updateClip(doc, clip.id, { text: { ...(clip.text ?? { content: "" }), content } }));
  };

  // discrete text-style edits — snapshot, apply, commit
  const commitText = (patch: Partial<NonNullable<Clip["text"]>>) => {
    startGesture();
    preview(updateClip(doc, clip.id, { text: { ...(clip.text ?? { content: "" }), ...patch } }));
    endGesture(true);
  };
  const toggleBold = () => commitText({ bold: !clip.text?.bold });
  const toggleItalic = () => commitText({ italic: !clip.text?.italic });
  const setAlign = (align: "left" | "center" | "right") => commitText({ align });
  const setColor = (color: string) => commitText({ color });
  const setFontSize = (fontSize: number) => commitText({ fontSize });
  const setFontFamily = (fontFamily: string) => commitText({ fontFamily });
  const setLineHeight = (lineHeight: number) => commitText({ lineHeight });
  const setLetterSpacing = (letterSpacing: number) => commitText({ letterSpacing });

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

  const updateRotation = (rotation: number) => {
    preview(updateTransform(doc, clip.id, { rotation: ((rotation % 360) + 360) % 360 }));
  };

  const updateEnd = (end: number) => updateDuration(Math.max(0.1, end - clip.start));

  // discrete transform toggles — snapshot, apply, commit in one step
  const commitTransform = (patch: Partial<Clip["transform"]>) => {
    startGesture();
    preview(updateTransform(doc, clip.id, patch));
    endGesture(true);
  };
  const toggleFlipH = () => commitTransform({ flipH: !clip.transform.flipH });
  const toggleFlipV = () => commitTransform({ flipV: !clip.transform.flipV });
  const toggleRoundCorners = () => commitTransform({ radius: clip.transform.radius ? 0 : 24 });
  const toggleFadeAudio = () => {
    startGesture();
    preview(updateClip(doc, clip.id, { fadeAudio: !clip.fadeAudio }));
    endGesture(true);
  };
  const fitCanvas = () => commitTransform({ fit: "contain", scale: 1, x: 0, y: 0 });
  const fillCanvas = () => commitTransform({ fit: "cover", scale: 1, x: 0, y: 0 });

  // stacking order — z override defaults to the clip's track index
  const trackIndex = doc.tracks.findIndex((t) => t.clips.some((c) => c.id === clip.id));
  const effZ = clip.transform.z ?? Math.max(0, trackIndex);
  const bringForward = () => commitTransform({ z: effZ + 1 });
  const sendBackward = () => commitTransform({ z: effZ - 1 });
  const bringToFront = () => commitTransform({ z: doc.tracks.length + 1 });
  const sendToBack = () => commitTransform({ z: -1 });

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
    updateRotation,
    updateEnd,
    toggleFadeAudio,
    toggleFlipH,
    toggleFlipV,
    toggleRoundCorners,
    fitCanvas,
    fillCanvas,
    toggleBold,
    toggleItalic,
    setAlign,
    setColor,
    setFontSize,
    setFontFamily,
    setLineHeight,
    setLetterSpacing,
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
  };
}
