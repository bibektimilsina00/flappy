"use client";

import { ArrowUp, Loader2, X } from "lucide-react";
import { type ReactNode, useState } from "react";
import { createPortal } from "react-dom";
import { adjustAsset, editAsset, gridExtract } from "@/features/projects";
import { useCanvasActions } from "../canvas-actions";

export type ImageAction =
  | "Extract from grid"
  | "Light tune"
  | "Expand image"
  | "Three-view diagram"
  | "Multi-angle views"
  | "Change angle"
  | "Image 1, 9-frame deduction"
  | "Storyboard 25-grid";

type Result = { key: string; url: string };
const msg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

export function ImageActionModal({
  action,
  sourceId,
  src,
  onClose,
}: {
  action: ImageAction;
  sourceId: string;
  src: string;
  onClose: () => void;
}) {
  const { addImageResults } = useCanvasActions();
  const [busy, setBusy] = useState(false);

  const run = async (task: () => Promise<Result[]>) => {
    setBusy(true);
    try {
      const results = await task();
      addImageResults(sourceId, results);
      onClose();
    } catch (e) {
      alert(msg(e));
      setBusy(false);
    }
  };
  const runEdit = (prompt: string, size?: string) =>
    run(async () => [await editAsset(src, prompt, size ? { size } : undefined)]);

  const body = (() => {
    switch (action) {
      case "Extract from grid":
        return <ExtractFromGrid src={src} busy={busy} onExtract={(r, c) => run(() => gridExtract(src, r, c))} onClose={onClose} />;
      case "Light tune":
        return <LightTune src={src} busy={busy} run={run} onClose={onClose} />;
      case "Expand image":
        return <ExpandImage src={src} busy={busy} runEdit={runEdit} onClose={onClose} />;
      case "Three-view diagram":
        return (
          <PromptAction
            title="Three-view diagram"
            src={src}
            busy={busy}
            credits={55}
            placeholder="Character three-view diagram"
            onClose={onClose}
            build={(p) =>
              `Create a character three-view reference sheet (front, side, and back views) of the main subject from this image. Keep the character design perfectly consistent across all three views, full body, neutral studio background, evenly spaced.${p ? ` ${p}` : ""}`
            }
            submit={runEdit}
          />
        );
      case "Multi-angle views":
        return <MultiAngle src={src} busy={busy} runEdit={runEdit} onClose={onClose} />;
      case "Change angle":
        return <ChangeAngle src={src} busy={busy} runEdit={runEdit} onClose={onClose} />;
      case "Image 1, 9-frame deduction":
        return (
          <PromptAction
            title="Image 1, 9-frame deduction"
            src={src}
            busy={busy}
            credits={82}
            placeholder="Image 1, 9-frame deduction"
            onClose={onClose}
            build={(p) =>
              `Create a 3x3 grid of 9 sequential frames showing the main subject from this image performing a smooth, natural motion sequence. Consistent character and style, frames read left-to-right, top-to-bottom.${p ? ` ${p}` : ""}`
            }
            submit={runEdit}
          />
        );
      case "Storyboard 25-grid":
        return (
          <PromptAction
            title="Storyboard 25-grid"
            src={src}
            busy={busy}
            credits={82}
            placeholder="Storyboard 25-Grid"
            onClose={onClose}
            build={(p) =>
              `Create a 5x5 storyboard grid of 25 sequential cinematic frames telling a short scene featuring the main subject from this image. Consistent character and style, numbered progression, left-to-right, top-to-bottom.${p ? ` ${p}` : ""}`
            }
            submit={runEdit}
          />
        );
    }
  })();

  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#0a0a0a]">{body}</div>,
    document.body,
  );
}

/* ── shared layout ─────────────────────────────────────────────────────────── */

export function Frame({
  title,
  onClose,
  preview,
  bar,
}: {
  title: string;
  onClose: () => void;
  preview: ReactNode;
  bar: ReactNode;
}) {
  return (
    <>
      <div className="flex justify-center py-4">
        <div className="flex items-center gap-3 rounded-full bg-[#2a2a2a] px-4 py-2">
          <span className="text-sm font-medium">{title}</span>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center overflow-hidden p-6">{preview}</div>
      <div className="px-6 pb-6">{bar}</div>
    </>
  );
}

export function Preview({ src }: { src: string }) {
  // biome-ignore lint/a11y/useAltText: editor asset
  return <img src={src} className="max-h-[70vh] rounded-lg object-contain" />;
}

export function Submit({ busy, credits, onClick }: { busy: boolean; credits?: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {credits ? <span>{credits}</span> : null}
      {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
    </button>
  );
}

export function Seg<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-[#2a2a2a] p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
            value === o.value ? "bg-white/15 text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ── 1. Extract from grid ──────────────────────────────────────────────────── */

function ExtractFromGrid({
  src,
  busy,
  onExtract,
  onClose,
}: {
  src: string;
  busy: boolean;
  onExtract: (rows: number, cols: number) => void;
  onClose: () => void;
}) {
  const [grid, setGrid] = useState(3);
  return (
    <Frame
      title="Extract from grid"
      onClose={onClose}
      preview={
        <div className="relative">
          <Preview src={src} />
          <div
            className="pointer-events-none absolute inset-0 grid"
            style={{ gridTemplateColumns: `repeat(${grid},1fr)`, gridTemplateRows: `repeat(${grid},1fr)` }}
          >
            {Array.from({ length: grid * grid }).map((_, i) => (
              <div key={i} className="border border-white/40" />
            ))}
          </div>
        </div>
      }
      bar={
        <div className="rounded-2xl bg-[#1a1a1a] p-5">
          <p className="mb-2 text-sm text-muted-foreground">Grid</p>
          <div className="flex items-center justify-between">
            <Seg
              options={[
                { label: "2 x 2", value: 2 },
                { label: "3 x 3", value: 3 },
                { label: "5 x 5", value: 5 },
              ]}
              value={grid}
              onChange={setGrid}
            />
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{grid * grid} image nodes</span>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-1.5 text-sm text-foreground/80 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onExtract(grid, grid)}
                disabled={busy}
                className="rounded-lg bg-white px-4 py-1.5 text-sm font-medium text-black hover:opacity-90 disabled:opacity-50"
              >
                {busy ? "Extracting…" : "Extract"}
              </button>
            </div>
          </div>
        </div>
      }
    />
  );
}

/* ── 2. Light tune ─────────────────────────────────────────────────────────── */

function LightTune({
  src,
  busy,
  run,
  onClose,
}: {
  src: string;
  busy: boolean;
  run: (task: () => Promise<Result[]>) => void;
  onClose: () => void;
}) {
  const [brightness, setB] = useState(1);
  const [contrast, setC] = useState(1);
  const [saturation, setS] = useState(1);
  const [temperature, setT] = useState(0);
  const filter = `brightness(${brightness}) contrast(${contrast}) saturate(${saturation}) sepia(${temperature > 0 ? temperature * 0.4 : 0})`;
  return (
    <Frame
      title="Light tune"
      onClose={onClose}
      preview={
        // biome-ignore lint/a11y/useAltText: editor asset
        <img src={src} style={{ filter }} className="max-h-[70vh] rounded-lg object-contain" />
      }
      bar={
        <div className="grid grid-cols-2 gap-x-10 gap-y-4 rounded-2xl bg-[#1a1a1a] p-5">
          <Range label="Brightness" min={0.2} max={1.8} value={brightness} onChange={setB} />
          <Range label="Contrast" min={0.2} max={1.8} value={contrast} onChange={setC} />
          <Range label="Saturation" min={0} max={2} value={saturation} onChange={setS} />
          <Range label="Warmth" min={-1} max={1} value={temperature} onChange={setT} />
          <div className="col-span-2 flex justify-end">
            <Submit busy={busy} onClick={() => run(() => adjustAsset(src, { brightness, contrast, saturation, temperature }).then((r) => [r]))} />
          </div>
        </div>
      }
    />
  );
}

function Range({
  label,
  min,
  max,
  value,
  onChange,
  step = 0.01,
  unit = "",
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  unit?: string;
}) {
  return (
    <label className="flex flex-1 flex-col gap-1.5 text-sm text-muted-foreground">
      <span>
        {label}{" "}
        <span className="text-foreground/70">
          {step >= 1 ? Math.round(value) : value.toFixed(2)}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-white"
      />
    </label>
  );
}

/* ── 3. Expand image ───────────────────────────────────────────────────────── */

const RATIOS = [
  { label: "9:16", value: "9:16" },
  { label: "16:9", value: "16:9" },
  { label: "1:1", value: "1:1" },
];

function ExpandImage({
  src,
  busy,
  runEdit,
  onClose,
}: {
  src: string;
  busy: boolean;
  runEdit: (prompt: string, size?: string) => void;
  onClose: () => void;
}) {
  const [ratio, setRatio] = useState("9:16");
  const [res, setRes] = useState("2k");
  const [prompt, setPrompt] = useState("");
  return (
    <Frame
      title="Expand image"
      onClose={onClose}
      preview={<Preview src={src} />}
      bar={
        <div className="rounded-2xl bg-[#1a1a1a] p-4">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the requested change"
            className="mb-3 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Seg options={RATIOS} value={ratio} onChange={setRatio} />
              <Seg
                options={[
                  { label: "2K", value: "2k" },
                  { label: "4K", value: "4k" },
                ]}
                value={res}
                onChange={setRes}
              />
            </div>
            <Submit
              busy={busy}
              credits={55}
              onClick={() =>
                runEdit(
                  `Expand and outpaint this image to a ${ratio} aspect ratio, seamlessly extending the scene into the newly revealed areas with matching lighting, perspective and style.${prompt ? ` ${prompt}` : ""}`,
                  res,
                )
              }
            />
          </div>
        </div>
      }
    />
  );
}

/* ── 4 & 7 & 8. Prompt-only actions ────────────────────────────────────────── */

function PromptAction({
  title,
  src,
  busy,
  credits,
  placeholder,
  build,
  submit,
  onClose,
}: {
  title: string;
  src: string;
  busy: boolean;
  credits: number;
  placeholder: string;
  build: (p: string) => string;
  submit: (prompt: string) => void;
  onClose: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  return (
    <Frame
      title={title}
      onClose={onClose}
      preview={<Preview src={src} />}
      bar={
        <div className="flex items-center gap-3 rounded-2xl bg-[#1a1a1a] p-4">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <Submit busy={busy} credits={credits} onClick={() => submit(build(prompt))} />
        </div>
      }
    />
  );
}

/* ── 5. Multi-angle views ──────────────────────────────────────────────────── */

function MultiAngle({
  src,
  busy,
  runEdit,
  onClose,
}: {
  src: string;
  busy: boolean;
  runEdit: (prompt: string) => void;
  onClose: () => void;
}) {
  const [ratio, setRatio] = useState("9:16");
  return (
    <Frame
      title="Multi-angle views"
      onClose={onClose}
      preview={<Preview src={src} />}
      bar={
        <div className="rounded-2xl bg-[#1a1a1a] p-5">
          <p className="mb-2 text-sm text-muted-foreground">Aspect ratio</p>
          <div className="flex items-center justify-between">
            <Seg options={RATIOS} value={ratio} onChange={setRatio} />
            <Submit
              busy={busy}
              credits={55}
              onClick={() =>
                runEdit(
                  `Create a multi-angle turnaround of the main subject from this image (front, three-quarter left, three-quarter right, side and back), consistent character and outfit, arranged neatly. Output aspect ratio ${ratio}.`,
                )
              }
            />
          </div>
        </div>
      }
    />
  );
}

/* ── 6. Change angle ───────────────────────────────────────────────────────── */

function ChangeAngle({
  src,
  busy,
  runEdit,
  onClose,
}: {
  src: string;
  busy: boolean;
  runEdit: (prompt: string) => void;
  onClose: () => void;
}) {
  const [rotation, setRot] = useState(20);
  const [tilt, setTilt] = useState(15);
  const [zoom, setZoom] = useState("Medium shot");
  return (
    <Frame
      title="Change angle"
      onClose={onClose}
      preview={
        <div style={{ perspective: 1000 }}>
          {/* biome-ignore lint/a11y/useAltText: editor asset */}
          <img
            src={src}
            className="max-h-[55vh] rounded-lg object-contain shadow-2xl transition-transform"
            style={{ transform: `rotateY(${rotation}deg) rotateX(${-tilt}deg)` }}
          />
        </div>
      }
      bar={
        <div className="flex items-end justify-between gap-8 rounded-2xl bg-[#1a1a1a] p-5">
          <Range label="Rotation" min={-80} max={80} step={1} unit="°" value={rotation} onChange={setRot} />
          <Range label="Tilt" min={-45} max={45} step={1} unit="°" value={tilt} onChange={setTilt} />
          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-muted-foreground">Zoom</span>
            <Seg
              options={[
                { label: "Close-up", value: "Close-up" },
                { label: "Medium shot", value: "Medium shot" },
                { label: "Wide-angle", value: "Wide-angle" },
              ]}
              value={zoom}
              onChange={setZoom}
            />
          </div>
          <Submit
            busy={busy}
            credits={55}
            onClick={() =>
              runEdit(
                `Re-render the main subject from this image from a new camera angle — rotate the view by ${rotation} degrees and tilt by ${tilt} degrees, framed as a ${zoom.toLowerCase()}. Keep the subject, outfit, lighting and style consistent.`,
              )
            }
          />
        </div>
      }
    />
  );
}
