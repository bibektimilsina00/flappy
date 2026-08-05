"use client";

import { ChevronDown } from "lucide-react";
import type React from "react";
import type { Clip, VideoEditorDoc } from "../../types";
import { useInspector } from "./use-inspector";

export function Inspector({
  clip,
  doc,
  startGesture,
  preview,
  endGesture,
  onClose,
}: {
  clip: Clip;
  doc: VideoEditorDoc;
  startGesture: () => void;
  preview: (d: VideoEditorDoc) => void;
  endGesture: (changed?: boolean) => void;
  onClose: () => void;
}) {
  const {
    media,
    visual,
    gestureProps: g,
    updateText,
    updateStart,
    updateDuration,
    updateSpeed,
    updateX,
    updateY,
    updateScale,
    updateOpacity,
    updateVolume,
  } = useInspector({ clip, doc, startGesture, preview, endGesture });

  return (
    <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin] select-none">
      <div className="flex items-center gap-1 border-b border-border px-2.5 py-2.5">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-base font-semibold capitalize transition-colors hover:bg-accent"
        >
          <ChevronDown className="size-4 rotate-90" />
          Edit {clip.kind}
        </button>
      </div>
      <div className="space-y-3 p-4">
        {clip.kind === "text" ? (
          <textarea
            value={clip.text?.content ?? ""}
            {...g}
            onChange={(e) => updateText(e.target.value)}
            className="w-full resize-none rounded-md border border-border bg-transparent p-2 text-sm outline-none focus:border-[#14b8a6]"
            rows={3}
          />
        ) : null}

        <Section title="Timing">
          <Row label="Start">
            <Num value={clip.start} min={0} step={0.1} g={g} onInput={updateStart} suffix="s" />
          </Row>
          <Row label="Duration">
            <Num value={clip.duration} min={0.1} step={0.1} g={g} onInput={updateDuration} suffix="s" />
          </Row>
          {media ? (
            <Row label="Speed">
              <Num value={clip.speed} min={0.25} step={0.05} g={g} onInput={updateSpeed} suffix="×" />
            </Row>
          ) : null}
        </Section>

        {visual ? (
          <Section title="Transform">
            <Row label="X">
              <Num value={clip.transform.x} step={2} g={g} onInput={updateX} suffix="px" />
            </Row>
            <Row label="Y">
              <Num value={clip.transform.y} step={2} g={g} onInput={updateY} suffix="px" />
            </Row>
            <Row label="Scale">
              <Slide value={clip.transform.scale} min={0.1} max={3} step={0.01} g={g} onInput={updateScale} />
            </Row>
            <Row label="Opacity">
              <Slide value={clip.transform.opacity} min={0} max={1} step={0.01} g={g} onInput={updateOpacity} />
            </Row>
          </Section>
        ) : null}

        {media ? (
          <Section title="Audio">
            <Row label="Volume">
              <Slide value={clip.volume} min={0} max={1} step={0.01} g={g} onInput={updateVolume} />
            </Row>
          </Section>
        ) : null}
      </div>
    </div>
  );
}

type GestureProps = { onPointerDown: () => void; onFocus: () => void; onBlur: () => void; onPointerUp: () => void };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[56px_1fr] items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function Num({ value, min, step, suffix, g, onInput }: { value: number; min?: number; step?: number; suffix?: string; g: GestureProps; onInput: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        value={Number(value.toFixed(2))}
        min={min}
        step={step}
        onFocus={g.onFocus}
        onBlur={g.onBlur}
        onChange={(e) => onInput(Number(e.target.value))}
        className="w-full rounded border border-border bg-transparent px-1.5 py-1 text-xs tabular-nums outline-none focus:border-[#14b8a6]"
      />
      {suffix ? <span className="text-[11px] text-muted-foreground">{suffix}</span> : null}
    </div>
  );
}

function Slide({ value, min, max, step, g, onInput }: { value: number; min: number; max: number; step: number; g: GestureProps; onInput: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onPointerDown={g.onPointerDown}
        onPointerUp={g.onPointerUp}
        onChange={(e) => onInput(Number(e.target.value))}
        className="h-1 w-full accent-[#14b8a6]"
      />
      <span className="w-8 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">{value.toFixed(2)}</span>
    </div>
  );
}
