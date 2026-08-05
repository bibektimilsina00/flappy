"use client";

import { Loader2, Music, Sparkles } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { useBalance } from "@/features/billing";
import { ModelSelector, useModels } from "@/features/models";
import type { Model } from "@/features/models";
import { type GenBody, useGeneration } from "../../hooks/use-generation";
import type { Clip, VideoEditorAsset } from "../../types";

const ACCENT = "#14b8a6";

export function GenPanel({
  kind,
  prompt,
  setPrompt,
  gen,
  assets,
  selectedClip,
}: {
  kind: "image" | "video";
  prompt: string;
  setPrompt: (v: string) => void;
  gen: ReturnType<typeof useGeneration>;
  assets: VideoEditorAsset[];
  selectedClip: Clip | null;
}) {
  const models = useModels(kind).data ?? [];
  const [modelId, setModelId] = useState("");
  const [params, setParams] = useState<Record<string, unknown>>({});
  const [source, setSource] = useState<"text" | "image" | "extend">("text");
  const [sourceId, setSourceId] = useState<string | null>(null);

  const model: Model | undefined = models.find((m) => m.id === modelId) ?? models[0];
  useEffect(() => {
    if (!modelId && models.length) setModelId((models.find((m) => m.default) ?? models[0]).id);
  }, [models, modelId]);

  const needsSource = kind === "video" && source !== "text";
  const sourceKind = source === "extend" ? "video" : "image";
  const sourceAssets = assets.filter((a) => (sourceKind === "video" ? a.kind === "video" : a.kind === "image"));
  // default the source to the selected clip's asset when the picker becomes relevant
  useEffect(() => {
    if (!needsSource) return;
    if (sourceId && sourceAssets.some((a) => a.id === sourceId)) return;
    const fromClip = selectedClip?.assetId ? sourceAssets.find((a) => a.id === selectedClip.assetId) : undefined;
    setSourceId(fromClip?.id ?? sourceAssets[0]?.id ?? null);
  }, [needsSource, sourceKind, selectedClip?.assetId, assets, sourceId, sourceAssets]);

  const canGenerate = prompt.trim().length > 0 && !!modelId && (!needsSource || !!sourceId) && !gen.running;
  const submit = () => {
    if (!canGenerate) return;
    const body: GenBody = { kind, prompt, model: modelId, params, source_asset_id: needsSource ? sourceId : null };
    gen.run(body);
  };
  const selectParams = model?.params.filter((p) => p.type === "select" && (p.options?.length ?? 0) > 0) ?? [];

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 [scrollbar-width:thin]">
      {kind === "video" ? (
        <Field label="Source">
          <PillRow
            options={["text", "image", "extend"]}
            labels={{ text: "Text", image: "Image", extend: "Extend" }}
            value={source}
            onChange={(v) => setSource(v as "text" | "image" | "extend")}
          />
        </Field>
      ) : null}

      {needsSource ? (
        <Field label={source === "extend" ? "Video to extend" : "Source image"}>
          <AssetPicker assets={sourceAssets} value={sourceId} onChange={setSourceId} />
        </Field>
      ) : null}

      <Field label={source === "extend" ? "How to continue" : "Description"}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={5}
          placeholder={kind === "image" ? "Describe the image…" : "Describe the video…"}
          className="w-full resize-none rounded-lg border border-border bg-secondary p-2.5 text-[13px] leading-relaxed outline-none focus:border-[#14b8a6]"
        />
      </Field>

      <Field label="Model">
        {models.length ? (
          <ModelSelector models={models} value={modelId} onChange={setModelId} />
        ) : (
          <p className="text-xs text-muted-foreground">Loading models…</p>
        )}
      </Field>

      {selectParams.map((p) => (
        <Field key={p.key} label={p.label}>
          <PillRow options={p.options as string[]} value={String(params[p.key] ?? p.default)} onChange={(v) => setParams((prev) => ({ ...prev, [p.key]: v }))} />
        </Field>
      ))}

      <GenerateFooter gen={gen} onGenerate={submit} disabled={!canGenerate} />
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[13px] font-medium">{label}</p>
      {children}
    </div>
  );
}

export function PillRow({ options, value, onChange, labels }: { options: string[]; value: string; onChange: (v: string) => void; labels?: Record<string, string> }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border p-1">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn("flex-1 truncate rounded-md py-1 text-xs capitalize tabular-nums", value === o ? "text-white" : "text-muted-foreground hover:text-foreground")}
          style={value === o ? { backgroundColor: ACCENT } : undefined}
        >
          {labels?.[o] ?? o}
        </button>
      ))}
    </div>
  );
}

export function AssetPicker({ assets, value, onChange }: { assets: VideoEditorAsset[]; value: string | null; onChange: (id: string) => void }) {
  if (!assets.length) {
    return <p className="rounded-lg border border-border bg-secondary p-2.5 text-xs text-muted-foreground">No matching media in this project yet.</p>;
  }
  return (
    <div className="grid max-h-40 grid-cols-3 gap-1.5 overflow-y-auto [scrollbar-width:thin]">
      {assets.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => onChange(a.id)}
          className={cn("relative aspect-square overflow-hidden rounded-md border", value === a.id ? "border-2" : "border-border")}
          style={value === a.id ? { borderColor: ACCENT } : undefined}
        >
          {a.kind === "video" ? (
            // biome-ignore lint/a11y/useMediaCaption: source thumbnail
            <video className="size-full object-cover" src={`${a.url}#t=0.1`} muted preload="metadata" playsInline />
          ) : a.kind === "audio" ? (
            <span className="flex size-full items-center justify-center bg-secondary">
              <Music className="size-4 text-muted-foreground" />
            </span>
          ) : (
            // biome-ignore lint/a11y/useAltText: source thumbnail
            <img className="size-full object-cover" src={a.url} alt="" />
          )}
        </button>
      ))}
    </div>
  );
}

export function GenerateFooter({ gen, onGenerate, disabled }: { gen: ReturnType<typeof useGeneration>; onGenerate: () => void; disabled: boolean }) {
  const { data: balance } = useBalance();
  return (
    <div className="space-y-2 pt-1">
      <GenStatus gen={gen} />
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Credits <Sparkles className="size-3.5" style={{ color: ACCENT }} /> {balance?.balance ?? "—"}
        </span>
        <button
          type="button"
          onClick={onGenerate}
          disabled={disabled}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: ACCENT }}
        >
          {gen.running ? (
            <>
              <Loader2 className="size-3.5 animate-spin" /> Generating…
            </>
          ) : (
            <>
              Generate <Sparkles className="size-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export function GenStatus({ gen }: { gen: ReturnType<typeof useGeneration> }) {
  if (gen.status === "error") {
    const upgrade = /premium|plan|credit/i.test(gen.error ?? "");
    return (
      <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
        {gen.error}
        {upgrade ? (
          <>
            {" — "}
            <a href="/pricing" className="underline underline-offset-2">
              upgrade
            </a>
          </>
        ) : null}
      </p>
    );
  }
  if (gen.status === "done") {
    return <p className="rounded-lg border border-border bg-secondary p-2 text-xs text-muted-foreground">Added to Media — drag it onto the timeline.</p>;
  }
  return null;
}
