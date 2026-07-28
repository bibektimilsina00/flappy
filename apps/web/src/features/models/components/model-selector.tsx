"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useBalance } from "@/features/billing";
import { popupRegistry } from "@/features/canvas/popup-registry";
import type { Model } from "../types";
import { ProviderIcon } from "./provider-icon";

interface ModelSelectorProps {
  models: Model[];
  value: string;
  onChange: (id: string) => void;
}

const MODE_TAG: Record<string, string> = { t2v: "T→V", i2v: "I→V", ref: "Ref" };

function ModelRow({
  model,
  active,
  locked,
  onSelect,
}: {
  model: Model;
  active: boolean;
  locked: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={locked}
      onClick={onSelect}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors ${
        locked
          ? "cursor-not-allowed text-muted-foreground/50"
          : active
            ? "bg-accent font-semibold text-foreground hover:bg-accent"
            : "text-foreground/90 hover:bg-accent"
      }`}
    >
      <span className={locked ? "opacity-50" : undefined}>
        <ProviderIcon provider={model.provider} size="md" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px]">{model.name}</span>
        {model.description ? (
          <span className="block truncate text-xs text-muted-foreground/70">
            {model.description}
          </span>
        ) : null}
      </span>
      {!locked && model.mode && MODE_TAG[model.mode] ? (
        <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {MODE_TAG[model.mode]}
        </span>
      ) : null}
    </button>
  );
}

// Fixed-position placement for the portaled dropdown, computed from the trigger rect.
type Placement = { left: number; width: number; top?: number; bottom?: number };

export function ModelSelector({ models, value, onChange }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Placement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const { data: balance } = useBalance();
  const isFree = balance?.plan !== "pro";
  const selected = models.find((m) => m.id === value) ?? models[0];

  // Position the portaled popup from the trigger, preferring to open upward.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const width = 320;
      const maxH = Math.min(380, window.innerHeight * 0.55);
      const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
      const openUp = r.top > maxH + 16 || r.top > window.innerHeight - r.bottom;
      setPos(openUp ? { left, width, bottom: window.innerHeight - r.top + 6 } : { left, width, top: r.bottom + 6 });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  // Close on outside click (works outside the canvas too) + let a canvas click close this first.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || popupRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    const unregister = popupRegistry.register(() => setOpen(false));
    return () => {
      document.removeEventListener("mousedown", onDown);
      unregister();
    };
  }, [open]);

  // Free first, then (on the free plan) an upgrade line, then the premium ones.
  const free = models.filter((m) => m.free !== false);
  const premium = models.filter((m) => m.free === false);

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm font-semibold transition-colors hover:text-foreground"
      >
        <ProviderIcon provider={selected?.provider} size="sm" />
        {selected?.name ?? "Model"}
        <ChevronDown className="size-4 text-muted-foreground" />
      </button>

      {open && pos && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={popupRef}
              data-popup
              style={{ position: "fixed", left: pos.left, top: pos.top, bottom: pos.bottom, width: pos.width }}
              className="z-[200] flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#1e1e1e] shadow-2xl"
            >
              <div className="max-h-[min(55vh,380px)] overflow-y-auto p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {free.length === 0 && premium.length === 0 ? (
                  <div className="px-2 py-6 text-center text-sm text-muted-foreground">No models</div>
                ) : null}

                {free.map((model) => (
                  <ModelRow
                    key={model.id}
                    model={model}
                    active={model.id === selected?.id}
                    locked={false}
                    onSelect={() => {
                      onChange(model.id);
                      setOpen(false);
                    }}
                  />
                ))}

                {isFree && premium.length > 0 ? (
                  <a href="/pricing" className="block px-2 py-2 text-sm text-muted-foreground hover:text-foreground">
                    <span className="text-[#4a9eff] underline underline-offset-2">Upgrade</span> your plan to unlock more models
                  </a>
                ) : null}

                {premium.map((model) => (
                  <ModelRow
                    key={model.id}
                    model={model}
                    active={model.id === selected?.id}
                    locked={isFree}
                    onSelect={() => {
                      onChange(model.id);
                      setOpen(false);
                    }}
                  />
                ))}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
