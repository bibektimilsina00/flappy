"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { useBalance } from "@/features/billing";
import { popupRegistry } from "@/features/editor/popup-registry";
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

export function ModelSelector({ models, value, onChange }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const { data: balance } = useBalance();
  const isFree = balance?.plan !== "pro";
  const selected = models.find((m) => m.id === value) ?? models[0];

  // Let a canvas click close this first (instead of deselecting the node).
  useEffect(() => {
    if (!open) return;
    return popupRegistry.register(() => setOpen(false));
  }, [open]);

  // Free first, then (on the free plan) an upgrade line, then the premium ones.
  const free = models.filter((m) => m.free !== false);
  const premium = models.filter((m) => m.free === false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm font-semibold transition-colors hover:text-foreground"
      >
        <ProviderIcon provider={selected?.provider} size="sm" />
        {selected?.name ?? "Model"}
        <ChevronDown className="size-4 text-muted-foreground" />
      </button>

      {open ? (
        <>
          <div
            data-popup
            className="absolute bottom-9 left-0 z-[100] flex w-[320px] flex-col overflow-hidden rounded-xl border border-white/10 bg-[#1e1e1e] shadow-2xl"
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
                <a
                  href="/pricing"
                  className="block px-2 py-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <span className="text-[#4a9eff] underline underline-offset-2">Upgrade</span> your
                  plan to unlock more models
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
          </div>
        </>
      ) : null}
    </div>
  );
}
