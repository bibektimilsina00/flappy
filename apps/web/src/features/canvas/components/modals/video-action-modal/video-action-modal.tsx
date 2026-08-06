"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { extractFrame, reframeVideo, trimVideo, upscaleVideo } from "@/features/projects";
import { useCanvasActions } from "../../canvas-actions";
import { Frame, Seg, Submit } from "../image-action-modal/image-action-modal";

export type VideoAction = "Extract frame" | "Reframe video" | "Trim video" | "Super resolution";

type Result = { key: string; url: string };
const msg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;

const RATIOS = [
  { key: "16:9", label: "16 : 9 Widescreen" },
  { key: "9:16", label: "9 : 16 Portrait" },
  { key: "1:1", label: "1 : 1 Square" },
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

  const run = async (task: () => Promise<Result>) => {
    setBusy(true);
    try {
      const res = await task();
      addImageResults(sourceId, [{ key: "", url: res.url }], "video");
      onClose();
    } catch (e) {
      alert(msg(e));
      setBusy(false);
    }
  };

  const body = (() => {
    switch (action) {
      case "Extract frame":
        return <ExtractFrame src={src} busy={busy} run={run} onClose={onClose} />;
      case "Reframe video":
        return <Reframe src={src} busy={busy} run={run} onClose={onClose} />;
      case "Trim video":
        return <Trim src={src} busy={busy} run={run} onClose={onClose} />;
      case "Super resolution":
        return <SuperRes src={src} busy={busy} run={run} onClose={onClose} />;
      default:
        return null;
    }
  })();

  if (!body) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      {body}
    </div>,
    document.body,
  );
}

function ExtractFrame({
  src,
  busy,
  run,
  onClose,
}: {
  src: string;
  busy: boolean;
  run: (t: () => Promise<Result>) => void;
  onClose: () => void;
}) {
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <Frame title="Extract frame" onClose={onClose}>
      <div className="flex flex-col gap-4">
        {/* biome-ignore lint/a11y/useMediaCaption: preview */}
        <video
          ref={videoRef}
          src={src}
          className="max-h-64 rounded-xl object-contain bg-black/40"
          onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          controls
        />
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Timestamp: {fmt(time)}</span>
            <span>Total: {fmt(dur)}</span>
          </div>
          <input
            type="range"
            min="0"
            max={dur || 1}
            step="0.1"
            value={time}
            onChange={(e) => {
              const v = Number(e.target.value);
              setTime(v);
              if (videoRef.current) videoRef.current.currentTime = v;
            }}
          />
        </div>
        <Submit busy={busy} credits={5} label="Extract current frame" onClick={() => run(() => extractFrame(src, time))} />
      </div>
    </Frame>
  );
}

function Reframe({
  src,
  busy,
  run,
  onClose,
}: {
  src: string;
  busy: boolean;
  run: (t: () => Promise<Result>) => void;
  onClose: () => void;
}) {
  const [ratio, setRatio] = useState("9:16");
  return (
    <Frame title="Reframe video" onClose={onClose}>
      <div className="flex flex-col gap-4">
        {/* biome-ignore lint/a11y/useMediaCaption: preview */}
        <video src={src} className="max-h-64 rounded-xl object-contain bg-black/40" controls />
        <Seg options={RATIOS} value={ratio} onChange={setRatio} />
        <Submit busy={busy} credits={15} label="Reframe Video" onClick={() => run(() => reframeVideo(src, ratio))} />
      </div>
    </Frame>
  );
}

function Trim({
  src,
  busy,
  run,
  onClose,
}: {
  src: string;
  busy: boolean;
  run: (t: () => Promise<Result>) => void;
  onClose: () => void;
}) {
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(5);
  const [dur, setDur] = useState(0);

  return (
    <Frame title="Trim video" onClose={onClose}>
      <div className="flex flex-col gap-4">
        {/* biome-ignore lint/a11y/useMediaCaption: preview */}
        <video
          src={src}
          className="max-h-64 rounded-xl object-contain bg-black/40"
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            setDur(d);
            setEnd(d);
          }}
          controls
        />
        <div className="flex flex-col gap-2 text-xs text-muted-foreground">
          <label className="flex justify-between">
            Start time: {fmt(start)}
            <input
              type="range"
              min="0"
              max={end}
              step="0.1"
              value={start}
              onChange={(e) => setStart(Number(e.target.value))}
            />
          </label>
          <label className="flex justify-between">
            End time: {fmt(end)}
            <input
              type="range"
              min={start}
              max={dur || 1}
              step="0.1"
              value={end}
              onChange={(e) => setEnd(Number(e.target.value))}
            />
          </label>
        </div>
        <Submit busy={busy} credits={10} label="Trim clip" onClick={() => run(() => trimVideo(src, start, end))} />
      </div>
    </Frame>
  );
}

function SuperRes({
  src,
  busy,
  run,
  onClose,
}: {
  src: string;
  busy: boolean;
  run: (t: () => Promise<Result>) => void;
  onClose: () => void;
}) {
  const [scale, setScale] = useState<"2x" | "4x">("2x");
  return (
    <Frame title="Super resolution" onClose={onClose}>
      <div className="flex flex-col gap-4">
        {/* biome-ignore lint/a11y/useMediaCaption: preview */}
        <video src={src} className="max-h-64 rounded-xl object-contain bg-black/40" controls />
        <Seg
          options={[
            { key: "2x", label: "2x Upscale (HD)" },
            { key: "4x", label: "4x Upscale (4K)" },
          ]}
          value={scale}
          onChange={setScale}
        />
        <Submit
          busy={busy}
          credits={scale === "2x" ? 30 : 60}
          label="Enhance resolution"
          onClick={() => run(() => upscaleVideo(src, scale === "2x" ? 2 : 4))}
        />
      </div>
    </Frame>
  );
}
