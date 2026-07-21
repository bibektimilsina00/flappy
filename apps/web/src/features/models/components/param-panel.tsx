"use client";

import { cn } from "@/lib/cn";
import type { Param } from "../types";

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
  return (
    <div className="w-[520px] rounded-xl border border-border bg-popover p-4 shadow-2xl">
      {params.map((param, index) => (
        <div key={param.key} className={index > 0 ? "mt-4" : ""}>
          <ParamField
            param={param}
            value={(values[param.key] ?? param.default) as string | number | boolean}
            onChange={(value) => onChange(param.key, value)}
          />
        </div>
      ))}
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
    param.type === "select"
      ? (param.options ?? [])
      : rangeOf(param.min ?? 1, param.max ?? 8);

  return (
    <div>
      <p className="mb-2 text-sm text-muted-foreground">{param.label}</p>
      <div className="flex flex-wrap gap-2">
        {choices.map((choice) => (
          <Pill
            key={choice}
            active={String(value) === String(choice)}
            onClick={() => onChange(choice)}
          >
            {choice}
          </Pill>
        ))}
      </div>
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-w-9 rounded-lg px-3 py-2 text-sm transition-colors",
        active
          ? "bg-[#4a4a4a] text-white"
          : "bg-[#2a2a2a] text-muted-foreground hover:bg-[#333]",
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
