"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { extractFrame, reframeVideo, trimVideo, upscaleVideo } from "@/features/projects";
import { useCanvasActions } from "../canvas-actions";
import { Frame, Seg, Submit } from "./image-action-modal";

export type VideoAction = "Extract frame" | "Reframe video" | "Trim video" | "Super resolution";

type Result = { key: string; url: string };
const msg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;

const RATIOS = [
  { label: "9:16", value: "9:16" },
  { label: "16:9", value: "16:9" },
  { label: "1:1", value: "1:1" },
];

export function VideoActionModal({
  action,
  sourceId,
  src,
  onClose,
}: {
  action: VideoAction;
  sourceId: string;
  src: string;
  onClose: () => void;
}) {
  const { addImageResults } = useCanvasActions();
  const [busy, setBusy] = useState(false);

  // Extract frame → image node; the rest → video node.
  const run = async (task: () => Promise<Result>, kind: "image" | "video") => {
    setBusy(true);
    try {
      addImageResults(sourceId, [await task()], kind);
      onClose();
    } catch (e) {
      alert(msg(e));
      setBusy(false);
    }
  };

  const body = (() => {
    switch (action) {
      case "Extract frame":
        return <ExtractFrame src={src} busy={busy} onClose={onClose} onRun={(t) => run(() => extractFrame(src, t), "image")} />;
      case "Reframe video":
        return <Reframe src={src} busy={busy} onClose={onClose} onRun={(r) => run(() => reframeVideo(src, r), "video")} />;
      case "Trim video":
        return <Trim src={src} busy={busy} onClose={onClose} onRun={(s, e) => run(() => trimVideo(src, s, e), "video")} />;
      case "Super resolution":
        return <SuperRes src={src} busy={busy} onClose={onClose} onRun={(sc) => run(() => upscaleVideo(src, sc), "video")} />;
    }
  })();

  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#0a0a0a]">{body}</div>,
    document.body,
  );
}

function Player({ videoRef, src }: { videoRef: React.RefObject<HTMLVideoElement | null>; src: string }) {
  // biome-ignore lint/a11y/useMediaCaption: editor asset
  return <video ref={videoRef} src={src} controls className="max-h-[62vh] rounded-lg" />;
}

/* ── Extract frame ─────────────────────────────────────────────────────────── */

function ExtractFrame({
  src,
  busy,
  onRun,
  onClose,
}: {
  src: string;
  busy: boolean;
  onRun: (time: number) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const seek = (t: number) => {
    setTime(t);
    if (ref.current) ref.current.currentTime = t;
  };
  return (
    <Frame
      title="Extract frame"
      onClose={onClose}
      preview={
        // biome-ignore lint/a11y/useMediaCaption: editor asset
        <video
          ref={ref}
          src={src}
          className="max-h-[62vh] rounded-lg"
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        />
      }
      bar={
        <div className="flex items-center gap-4 rounded-2xl bg-[#1a1a1a] p-5">
          <span className="w-12 shrink-0 text-sm tabular-nums text-muted-foreground">{fmt(time)}</span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.05}
            value={time}
            onChange={(e) => seek(Number(e.target.value))}
            className="flex-1 accent-white"
          />
          <span className="w-12 shrink-0 text-right text-sm tabular-nums text-muted-foreground">{fmt(duration)}</span>
          <Submit busy={busy} onClick={() => onRun(time)} />
        </div>
      }
    />
  );
}

/* ── Reframe ───────────────────────────────────────────────────────────────── */

function Reframe({
  src,
  busy,
  onRun,
  onClose,
}: {
  src: string;
  busy: boolean;
  onRun: (ratio: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [ratio, setRatio] = useState("9:16");
  return (
    <Frame
      title="Reframe video"
      onClose={onClose}
      preview={<Player videoRef={ref} src={src} />}
      bar={
        <div className="rounded-2xl bg-[#1a1a1a] p-5">
          <p className="mb-2 text-sm text-muted-foreground">Aspect ratio</p>
          <div className="flex items-center justify-between">
            <Seg options={RATIOS} value={ratio} onChange={setRatio} />
            <Submit busy={busy} onClick={() => onRun(ratio)} />
          </div>
        </div>
      }
    />
  );
}

/* ── Trim ──────────────────────────────────────────────────────────────────── */

function Trim({
  src,
  busy,
  onRun,
  onClose,
}: {
  src: string;
  busy: boolean;
  onRun: (start: number, end: number) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  return (
    <Frame
      title="Trim video"
      onClose={onClose}
      preview={
        // biome-ignore lint/a11y/useMediaCaption: editor asset
        <video
          ref={ref}
          src={src}
          controls
          className="max-h-[62vh] rounded-lg"
          onLoadedMetadata={(e) => {
            setDuration(e.currentTarget.duration);
            setEnd(e.currentTarget.duration);
          }}
        />
      }
      bar={
        <div className="rounded-2xl bg-[#1a1a1a] p-5">
          <div className="mb-2 flex justify-between text-sm text-muted-foreground">
            <span>Start {fmt(start)}</span>
            <span>End {fmt(end)}</span>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.05}
              value={start}
              onChange={(e) => setStart(Math.min(Number(e.target.value), end - 0.1))}
              className="flex-1 accent-white"
            />
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.05}
              value={end}
              onChange={(e) => setEnd(Math.max(Number(e.target.value), start + 0.1))}
              className="flex-1 accent-white"
            />
            <Submit busy={busy} onClick={() => onRun(start, end)} />
          </div>
        </div>
      }
    />
  );
}

/* ── Super resolution ──────────────────────────────────────────────────────── */

function SuperRes({
  src,
  busy,
  onRun,
  onClose,
}: {
  src: string;
  busy: boolean;
  onRun: (scale: number) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [scale, setScale] = useState(2);
  return (
    <Frame
      title="Super resolution"
      onClose={onClose}
      preview={<Player videoRef={ref} src={src} />}
      bar={
        <div className="rounded-2xl bg-[#1a1a1a] p-5">
          <p className="mb-2 text-sm text-muted-foreground">Upscale</p>
          <div className="flex items-center justify-between">
            <Seg
              options={[
                { label: "2×", value: 2 },
                { label: "4×", value: 4 },
              ]}
              value={scale}
              onChange={setScale}
            />
            <Submit busy={busy} onClick={() => onRun(scale)} />
          </div>
        </div>
      }
    />
  );
}
