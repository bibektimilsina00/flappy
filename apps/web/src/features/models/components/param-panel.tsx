"use client";

import { RectangleHorizontal, RectangleVertical, Sliders, Square } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Param } from "../types";

const isRatio = (v: unknown): v is string => typeof v === "string" && /^\d+:\d+$/.test(v);
const ratioParam = (p: Param) =>
  p.type === "select" && (p.options?.length ?? 0) > 0 && (p.options ?? []).every(isRatio);

export function paramSummary(params: Param[], values: Record<string, unknown>): string {
  return params
    .map((p) => {
      const value = values[p.key] ?? p.default;
      if (p.type === "boolean") return value ? "On" : "Off";
      return String(value);
    })
    .join(" · ");
}

interface ParamPanelProps {
  params: Param[];
  values: Record<string, unknown>;
  onChange: (key: string, value: string | number | boolean) => void;
}

export function ParamPanel({ params, values, onChange }: ParamPanelProps) {
  const val = (p: Param) => (values[p.key] ?? p.default) as string | number | boolean;
  const summary = params
    .filter((p) => p.type !== "boolean")
    .map((p) => String(val(p)))
    .slice(0, 3)
    .join(" / ");

  return (
    <div className="w-[420px] max-w-[80vw] rounded-xl border border-border bg-popover p-4 shadow-2xl">
      <div className="max-h-[60vh] space-y-4 overflow-y-auto [scrollbar-width:thin]">
        {params.map((param) => (
          <ParamField key={param.key} param={param} value={val(param)} onChange={(v) => onChange(param.key, v)} />
        ))}
      </div>
      {summary ? (
        <div className="mt-3 flex items-center gap-2 border-t border-border pt-3 text-sm text-muted-foreground">
          <Sliders className="size-4" />
          <span className="text-foreground/90">{summary}</span>
        </div>
      ) : null}
    </div>
  );
}

function ParamField({
  param,
  value,
  onChange,
}: {
  param: Param;
  value: string | number | boolean;
  onChange: (value: string | number | boolean) => void;
}) {
  if (param.type === "boolean") {
    return (
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{param.label}</span>
        <Toggle checked={Boolean(value)} onChange={onChange} />
      </div>
    );
  }

  const choices: (string | number)[] =
    param.type === "select" ? (param.options ?? []) : rangeOf(param.min ?? 1, param.max ?? 8);
  const withIcons = ratioParam(param);

  return (
    <div>
      <p className="mb-2 text-sm text-muted-foreground">{param.label}</p>
      <div className="flex flex-wrap gap-2">
        {choices.map((choice) => (
          <Pill key={choice} active={String(value) === String(choice)} onClick={() => onChange(choice)}>
            {withIcons ? <RatioIcon ratio={String(choice)} /> : null}
            {choice}
          </Pill>
        ))}
      </div>
    </div>
  );
}

function RatioIcon({ ratio }: { ratio: string }) {
  const [w, h] = ratio.split(":").map(Number);
  const cls = "size-3.5 shrink-0";
  if (!w || !h || w === h) return <Square className={cls} />;
  return w > h ? <RectangleHorizontal className={cls} /> : <RectangleVertical className={cls} />;
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-w-9 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors",
        active ? "bg-[#4a4a4a] text-white" : "bg-[#2a2a2a] text-muted-foreground hover:bg-[#333]",
      )}
    >
      {children}
    </button>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 rounded-full transition-colors",
        checked ? "bg-neutral-300" : "bg-neutral-700",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

function rangeOf(min: number, max: number): number[] {
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
}
