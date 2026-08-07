"use client";

import { ArrowUp, Loader2, X } from "lucide-react";
import { type ReactNode, useState } from "react";
import { createPortal } from "react-dom";
import { adjustAsset, editAsset, gridExtract } from "@/features/projects";
import { useCanvasActions } from "../../canvas-actions";
import { type ImageAction, useImageActionModal } from "./hooks/use-image-action-modal";

export type { ImageAction };

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
  const { busy, run, runEdit } = useImageActionModal(sourceId, src, onClose);

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
              `Create a 5x5 grid storyboard of 25 frames detailing a continuous narrative sequence featuring the main subject from this image. Consistent character, dynamic shot angles, cinematic lighting.${p ? ` ${p}` : ""}`
            }
            submit={runEdit}
          />
        );
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

export function Frame({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto p-5">{children}</div>
    </div>
  );
}

export function Submit({ busy, credits, label = "Generate", onClick }: { busy: boolean; credits?: number; label?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="flex items-center justify-center gap-2 rounded-xl bg-teal-400 px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-teal-300 disabled:opacity-50"
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : null}
      {label} {credits ? `(${credits} credits)` : ""}
    </button>
  );
}

export function Seg<T extends string>({ options, value, onChange }: { options: { key: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-xl bg-muted p-1">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${
            value === o.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ExtractFromGrid({ src, busy, onExtract, onClose }: { src: string; busy: boolean; onExtract: (r: number, c: number) => void; onClose: () => void }) {
  const [grid, setGrid] = useState<"2x2" | "3x3">("2x2");
  return (
    <Frame title="Extract from grid" onClose={onClose}>
      <div className="flex flex-col gap-4">
        {/* biome-ignore lint/a11y/useAltText: preview */}
        <img src={src} className="max-h-64 rounded-xl object-contain bg-black/40" />
        <Seg options={[{ key: "2x2", label: "2 × 2 (4 panels)" }, { key: "3x3", label: "3 × 3 (9 panels)" }]} value={grid} onChange={setGrid} />
        <Submit busy={busy} credits={5} label="Extract panels" onClick={() => onExtract(grid === "2x2" ? 2 : 3, grid === "2x2" ? 2 : 3)} />
      </div>
    </Frame>
  );
}

function LightTune({ src, busy, run, onClose }: { src: string; busy: boolean; run: (task: () => Promise<{ key: string; url: string }[]>) => void; onClose: () => void }) {
  const [bright, setBright] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [sat, setSat] = useState(0);

  return (
    <Frame title="Light tune" onClose={onClose}>
      <div className="flex flex-col gap-4">
        {/* biome-ignore lint/a11y/useAltText: preview */}
        <img src={src} className="max-h-64 rounded-xl object-contain bg-black/40" />
        <div className="flex flex-col gap-3">
          <label className="flex flex-col text-xs text-muted-foreground">
            Brightness ({bright})
            <input type="range" min="-50" max="50" value={bright} onChange={(e) => setBright(Number(e.target.value))} />
          </label>
          <label className="flex flex-col text-xs text-muted-foreground">
            Contrast ({contrast})
            <input type="range" min="-50" max="50" value={contrast} onChange={(e) => setContrast(Number(e.target.value))} />
          </label>
          <label className="flex flex-col text-xs text-muted-foreground">
            Saturation ({sat})
            <input type="range" min="-50" max="50" value={sat} onChange={(e) => setSat(Number(e.target.value))} />
          </label>
        </div>
        <Submit busy={busy} credits={2} label="Apply adjustment" onClick={() => run(async () => [await adjustAsset(src, { brightness: bright, contrast, saturation: sat })])} />
      </div>
    </Frame>
  );
}

function ExpandImage({ src, busy, runEdit, onClose }: { src: string; busy: boolean; runEdit: (p: string, size?: string) => void; onClose: () => void }) {
  const [ratio, setRatio] = useState("16:9");
  return (
    <Frame title="Expand image" onClose={onClose}>
      <div className="flex flex-col gap-4">
        {/* biome-ignore lint/a11y/useAltText: preview */}
        <img src={src} className="max-h-64 rounded-xl object-contain bg-black/40" />
        <Seg options={[{ key: "16:9", label: "16 : 9 Widescreen" }, { key: "9:16", label: "9 : 16 Portrait" }, { key: "1:1", label: "1 : 1 Square" }]} value={ratio} onChange={setRatio} />
        <Submit busy={busy} credits={35} label="Expand Canvas" onClick={() => runEdit("Expand image naturally filling outer bounds matching style", ratio)} />
      </div>
    </Frame>
  );
}

function PromptAction({ title, src, busy, credits, placeholder, build, submit, onClose }: { title: string; src: string; busy: boolean; credits: number; placeholder: string; build: (p: string) => string; submit: (p: string) => void; onClose: () => void }) {
  const [prompt, setPrompt] = useState("");
  return (
    <Frame title={title} onClose={onClose}>
      <div className="flex flex-col gap-4">
        {/* biome-ignore lint/a11y/useAltText: preview */}
        <img src={src} className="max-h-64 rounded-xl object-contain bg-black/40" />
        <input type="text" placeholder={placeholder} value={prompt} onChange={(e) => setPrompt(e.target.value)} className="w-full rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-xs outline-none focus:border-foreground/40" />
        <Submit busy={busy} credits={credits} onClick={() => submit(build(prompt))} />
      </div>
    </Frame>
  );
}

function MultiAngle({ src, busy, runEdit, onClose }: { src: string; busy: boolean; runEdit: (p: string) => void; onClose: () => void }) {
  const [view, setView] = useState("4");
  return (
    <Frame title="Multi-angle views" onClose={onClose}>
      <div className="flex flex-col gap-4">
        {/* biome-ignore lint/a11y/useAltText: preview */}
        <img src={src} className="max-h-64 rounded-xl object-contain bg-black/40" />
        <Seg options={[{ key: "4", label: "4 Grid Angles" }, { key: "9", label: "9 Grid Angles" }]} value={view} onChange={setView} />
        <Submit busy={busy} credits={82} onClick={() => runEdit(`Create a ${view}-grid showing the subject from ${view} distinct camera angles`)} />
      </div>
    </Frame>
  );
}

function ChangeAngle({ src, busy, runEdit, onClose }: { src: string; busy: boolean; runEdit: (p: string) => void; onClose: () => void }) {
  const [angle, setAngle] = useState("top-down");
  return (
    <Frame title="Change angle" onClose={onClose}>
      <div className="flex flex-col gap-4">
        {/* biome-ignore lint/a11y/useAltText: preview */}
        <img src={src} className="max-h-64 rounded-xl object-contain bg-black/40" />
        <Seg options={[{ key: "top-down", label: "Top-down" }, { key: "low-angle", label: "Low angle" }, { key: "close-up", label: "Close up" }]} value={angle} onChange={setAngle} />
        <Submit busy={busy} credits={35} onClick={() => runEdit(`Re-render subject from a ${angle} camera angle`)} />
      </div>
    </Frame>
  );
}
