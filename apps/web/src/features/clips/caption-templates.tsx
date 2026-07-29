"use client";

import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import type { CustomCaptionStyle } from "./api";

// ── style definitions ────────────────────────────────────────────────────────

export const PRESET_META: { id: string; name: string; bg: string }[] = [
  { id: "clean", name: "Clean", bg: "from-slate-700 to-slate-900" },
  { id: "bold", name: "Bold", bg: "from-indigo-800 to-slate-900" },
  { id: "highlight", name: "Highlight", bg: "from-teal-900 to-slate-900" },
  { id: "beast", name: "Beast", bg: "from-amber-800 to-stone-900" },
  { id: "neon", name: "Neon", bg: "from-cyan-950 to-slate-900" },
  { id: "mono", name: "Minimal", bg: "from-neutral-800 to-neutral-900" },
];

const SIZE_PX = { s: 10, m: 12, l: 14 } as const;

export interface ResolvedCaptionCss {
  base: React.CSSProperties;
  active: React.CSSProperties;
  className: string;
  boxed: boolean;
  middle: boolean;
}

// One resolver for preview cards AND the player overlay, mirroring the server's
// ASS presets so what you pick is what burns.
export function captionCss(style: string, custom?: CustomCaptionStyle | null, scale = 1): ResolvedCaptionCss {
  const px = (n: number) => `${Math.round(n * scale)}px`;
  if (style === "custom" && custom) {
    return {
      base: {
        color: custom.color,
        fontSize: px(SIZE_PX[custom.size] ?? 12),
        fontWeight: custom.bold ? 700 : 500,
        textTransform: custom.uppercase ? "uppercase" : "none",
        textShadow: custom.box ? "none" : "0 1px 3px rgba(0,0,0,0.9)",
      },
      active: { color: custom.highlight },
      className: "",
      boxed: custom.box,
      middle: custom.position === "middle",
    };
  }
  switch (style) {
    case "bold":
      return {
        base: { color: "#fff", fontSize: px(13), fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em", textShadow: "0 1px 3px rgba(0,0,0,0.9)" },
        active: {},
        className: "",
        boxed: false,
        middle: false,
      };
    case "highlight":
      return {
        base: { color: "#fff", fontSize: px(12), fontWeight: 700, textShadow: "0 1px 3px rgba(0,0,0,0.9)" },
        active: { color: "#2dd4bf" },
        className: "",
        boxed: false,
        middle: false,
      };
    case "beast":
      return {
        base: { color: "#fff", fontSize: px(13), fontWeight: 800, textTransform: "uppercase", textShadow: "0 2px 4px rgba(0,0,0,0.95)" },
        active: { color: "#FFD700" },
        className: "",
        boxed: false,
        middle: false,
      };
    case "neon":
      return {
        base: { color: "#fff", fontSize: px(12), fontWeight: 700, textShadow: "0 0 6px #14b8a6, 0 0 12px rgba(20,184,166,0.7)" },
        active: {},
        className: "",
        boxed: false,
        middle: false,
      };
    case "mono":
      return {
        base: { color: "rgba(255,255,255,0.92)", fontSize: px(10), fontWeight: 500, textShadow: "0 1px 2px rgba(0,0,0,0.9)" },
        active: {},
        className: "",
        boxed: false,
        middle: false,
      };
    default: // clean
      return {
        base: { color: "#fff", fontSize: px(11), fontWeight: 600 },
        active: {},
        className: "",
        boxed: true,
        middle: false,
      };
  }
}

// ── user templates (localStorage; server sync when accounts need it) ─────────

export interface UserTemplate {
  id: string;
  def: CustomCaptionStyle;
}

const LS_KEY = "flappy-caption-templates";

export function loadTemplates(): UserTemplate[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function persistTemplates(list: UserTemplate[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(list));
}

// ── sample line used across previews ─────────────────────────────────────────

export function CaptionSample({
  css,
  text = "Here is your subtitle",
  activeIndex = 1,
}: {
  css: ResolvedCaptionCss;
  text?: string;
  activeIndex?: number;
}) {
  const words = text.split(" ");
  return (
    <span
      className={cn("max-w-full text-center leading-snug", css.boxed && "rounded bg-black/60 px-1.5 py-0.5")}
      style={css.base}
    >
      {words.map((w, i) => (
        <span key={`${w}-${i}`} style={i === activeIndex ? css.active : undefined}>
          {w}{" "}
        </span>
      ))}
    </span>
  );
}

// ── the tabbed picker (Featured | My templates) ──────────────────────────────

export function CaptionStylePicker({
  captions,
  style,
  custom,
  onChange,
}: {
  captions: boolean;
  style: string;
  custom: CustomCaptionStyle | null;
  onChange: (patch: { captions: boolean; caption_style?: string; caption_custom?: CustomCaptionStyle | null }) => void;
}) {
  const [tab, setTab] = useState<"featured" | "mine">("featured");
  const [templates, setTemplates] = useState<UserTemplate[]>([]);
  const [editing, setEditing] = useState<UserTemplate | "new" | null>(null);

  useEffect(() => {
    setTemplates(loadTemplates());
  }, []);

  const saveTemplate = (tpl: UserTemplate) => {
    const list = [...templates.filter((t) => t.id !== tpl.id), tpl];
    setTemplates(list);
    persistTemplates(list);
    onChange({ captions: true, caption_style: "custom", caption_custom: tpl.def });
  };

  const deleteTemplate = (id: string) => {
    const list = templates.filter((t) => t.id !== id);
    setTemplates(list);
    persistTemplates(list);
  };

  const card = (
    key: string,
    name: string,
    bg: string,
    active: boolean,
    onClick: () => void,
    css: ResolvedCaptionCss | null,
    extra?: React.ReactNode,
  ) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      className={cn(
        "group relative h-[250px] w-[148px] shrink-0 snap-start overflow-hidden rounded-2xl border-2 text-left transition-all",
        active ? "border-teal-400 shadow-[0_0_20px_-6px_rgba(45,212,191,0.5)]" : "border-white/10 hover:border-white/30",
      )}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br", bg)} />
      {active ? (
        <span className="absolute left-2 top-2 z-10 grid size-6 place-items-center rounded-full bg-teal-400 text-black">
          <Check className="size-3.5" />
        </span>
      ) : null}
      {css ? (
        <span className={cn("absolute inset-x-2 flex justify-center", css.middle ? "top-1/2 -translate-y-1/2" : "bottom-14")}>
          <CaptionSample css={css} />
        </span>
      ) : (
        <span className="absolute inset-0 grid place-items-center text-sm text-white/35">No captions</span>
      )}
      {/* name inside the card, over a bottom fade */}
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent pb-2.5 pt-8 text-center text-sm font-medium text-white">
        {name}
      </span>
      {extra}
    </button>
  );

  return (
    <div>
      {/* folder-style tabs: the active tab connects to the panel below */}
      <div className="flex items-end gap-1">
        {(
          [
            { id: "featured", label: "Featured" },
            { id: "mine", label: "My templates" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "-mb-px rounded-t-2xl border px-5 py-3 text-sm transition-all",
              tab === t.id
                ? "relative z-10 border-white/15 border-b-transparent bg-[#161616] font-semibold text-foreground"
                : "translate-y-[3px] border-white/[0.07] bg-white/[0.015] pb-2 text-muted-foreground/70 hover:bg-white/[0.05] hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex snap-x gap-3 overflow-x-auto rounded-xl rounded-tl-none border border-white/15 bg-[#161616] p-4 [scrollbar-width:thin]">
        {tab === "featured" ? (
          <>
            {PRESET_META.map((p) =>
              card(
                p.id,
                p.name,
                p.bg,
                captions && style === p.id,
                () => onChange({ captions: true, caption_style: p.id }),
                captionCss(p.id, null, 0.9),
              ),
            )}
            {card("off", "No captions", "from-neutral-900 to-neutral-950", !captions, () => onChange({ captions: false }), null)}
          </>
        ) : (
          <>
            {templates.map((tpl) =>
              card(
                tpl.id,
                tpl.def.name,
                "from-slate-800 to-slate-950",
                captions && style === "custom" && custom?.name === tpl.def.name,
                () => onChange({ captions: true, caption_style: "custom", caption_custom: tpl.def }),
                captionCss("custom", tpl.def, 0.9),
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditing(tpl);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && setEditing(tpl)}
                  className="absolute left-1.5 top-1.5 z-10 hidden rounded-md bg-black/60 p-1 text-white/80 hover:text-white group-hover:block"
                >
                  <Pencil className="size-3" />
                </span>,
              ),
            )}
            <button
              type="button"
              onClick={() => setEditing("new")}
              className="grid h-[250px] w-[148px] shrink-0 snap-start place-items-center rounded-2xl border-2 border-dashed border-white/15 text-muted-foreground transition-colors hover:border-teal-400/50 hover:text-teal-300"
            >
              <span className="flex flex-col items-center gap-1.5 text-xs">
                <Plus className="size-5" />
                Create new
              </span>
            </button>
          </>
        )}
      </div>

      {editing ? (
        <TemplateEditor
          initial={editing === "new" ? null : editing}
          onSave={(tpl) => {
            saveTemplate(tpl);
            setEditing(null);
          }}
          onDelete={
            editing !== "new"
              ? () => {
                  deleteTemplate(editing.id);
                  setEditing(null);
                }
              : undefined
          }
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}

// ── template editor modal (two panels: controls + live phone preview) ────────

const SWATCHES: { id: string; patch: Partial<CustomCaptionStyle> }[] = [
  { id: "green-caps", patch: { color: "#FFFFFF", highlight: "#22C55E", bold: true, uppercase: true, box: false } },
  { id: "yellow-soft", patch: { color: "#FFFFFF", highlight: "#FACC15", bold: false, uppercase: false, box: false } },
  { id: "yellow-caps", patch: { color: "#FFFFFF", highlight: "#FACC15", bold: true, uppercase: true, box: false } },
  { id: "soft-white", patch: { color: "#E5E5E5", highlight: "#FFFFFF", bold: false, uppercase: false, box: false } },
  { id: "blue-pop", patch: { color: "#FFFFFF", highlight: "#3B82F6", bold: true, uppercase: false, box: false } },
  { id: "red-caps", patch: { color: "#FFFFFF", highlight: "#EF4444", bold: true, uppercase: true, box: false } },
  { id: "all-yellow", patch: { color: "#FACC15", highlight: "#FACC15", bold: true, uppercase: false, box: false } },
  { id: "teal", patch: { color: "#FFFFFF", highlight: "#2DD4BF", bold: true, uppercase: false, box: false } },
  { id: "boxed", patch: { color: "#FFFFFF", highlight: "#FFFFFF", bold: false, uppercase: false, box: true } },
];

const HEADLINE_BGS = ["#FFFFFF", "#000000", "#FACC15", "#2DD4BF"];

const textOn = (bg: string) => {
  const c = bg.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2) || "ff", 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#000000" : "#FFFFFF";
};

const matchesSwatch = (def: CustomCaptionStyle, patch: Partial<CustomCaptionStyle>) =>
  Object.entries(patch).every(([k, v]) => def[k as keyof CustomCaptionStyle] === v);

function TemplateEditor({
  initial,
  onSave,
  onDelete,
  onClose,
}: {
  initial: UserTemplate | null;
  onSave: (tpl: UserTemplate) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [def, setDef] = useState<CustomCaptionStyle>(
    initial?.def ?? {
      name: "",
      color: "#FFFFFF",
      highlight: "#2DD4BF",
      size: "m",
      bold: true,
      uppercase: false,
      box: false,
      position: "bottom",
      headline: { enabled: false, bg: "#FFFFFF", color: "#000000" },
    },
  );
  const [advanced, setAdvanced] = useState(false);
  const set = (patch: Partial<CustomCaptionStyle>) => setDef((d) => ({ ...d, ...patch }));
  const css = captionCss("custom", def, 1.2);
  const headline = def.headline ?? { enabled: false, bg: "#FFFFFF", color: "#000000" };

  return (
    <div className="dark fixed inset-0 z-[210] grid place-items-center bg-black/80 p-4" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl border border-white/10 bg-[#1a1a1a] text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
          <h3 className="text-base font-bold">{initial ? "Edit template" : "New template"}</h3>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 md:grid-cols-[1fr_260px]">
          {/* controls */}
          <div className="min-h-0 space-y-5 overflow-y-auto p-5 [scrollbar-width:thin]">
            <input
              value={def.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="Template name"
              className="w-full rounded-xl border border-white/10 bg-[#161616] px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-teal-400/50"
            />

            {/* subtitle swatches */}
            <div>
              <p className="mb-2 text-sm font-medium">Subtitles</p>
              <div className="grid grid-cols-3 gap-2">
                {SWATCHES.map((sw) => {
                  const active = matchesSwatch(def, sw.patch);
                  return (
                    <button
                      key={sw.id}
                      type="button"
                      onClick={() => set(sw.patch)}
                      className={cn(
                        "grid h-14 place-items-center overflow-hidden rounded-lg border bg-gradient-to-br from-neutral-600 to-neutral-800 px-1 transition-all",
                        active ? "border-teal-400 ring-1 ring-teal-400" : "border-white/10 hover:border-white/30",
                      )}
                    >
                      <CaptionSample css={captionCss("custom", { ...def, ...sw.patch }, 0.75)} text="Five boxing wizards" />
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setAdvanced((v) => !v)}
                className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 py-2.5 text-sm text-foreground/90 transition-colors hover:bg-white/10"
              >
                <Pencil className="size-3.5" />
                Advanced settings
              </button>
              {advanced ? (
                <div className="mt-3 space-y-3 rounded-xl border border-white/10 p-3">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-xs">
                      <span className="mb-1 block text-muted-foreground">Text color</span>
                      <input type="color" value={def.color} onChange={(e) => set({ color: e.target.value })} className="h-9 w-full cursor-pointer rounded-lg border border-white/10 bg-[#161616] p-1" />
                    </label>
                    <label className="block text-xs">
                      <span className="mb-1 block text-muted-foreground">Active word</span>
                      <input type="color" value={def.highlight} onChange={(e) => set({ highlight: e.target.value })} className="h-9 w-full cursor-pointer rounded-lg border border-white/10 bg-[#161616] p-1" />
                    </label>
                    <label className="block text-xs">
                      <span className="mb-1 block text-muted-foreground">Size</span>
                      <select value={def.size} onChange={(e) => set({ size: e.target.value as CustomCaptionStyle["size"] })} className="w-full rounded-lg border border-white/10 bg-[#161616] px-2 py-2 outline-none">
                        <option value="s">Small</option>
                        <option value="m">Medium</option>
                        <option value="l">Large</option>
                      </select>
                    </label>
                    <label className="block text-xs">
                      <span className="mb-1 block text-muted-foreground">Position</span>
                      <select value={def.position} onChange={(e) => set({ position: e.target.value as CustomCaptionStyle["position"] })} className="w-full rounded-lg border border-white/10 bg-[#161616] px-2 py-2 outline-none">
                        <option value="bottom">Bottom</option>
                        <option value="middle">Middle</option>
                      </select>
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs">
                    {(
                      [
                        ["bold", "Bold"],
                        ["uppercase", "UPPERCASE"],
                        ["box", "Background box"],
                      ] as const
                    ).map(([key, label]) => (
                      <label key={key} className="flex cursor-pointer items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={Boolean(def[key])}
                          onChange={(e) => set({ [key]: e.target.checked } as Partial<CustomCaptionStyle>)}
                          className="size-3.5 accent-teal-400"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {/* headline */}
            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Headline</p>
                <button
                  type="button"
                  role="switch"
                  aria-checked={headline.enabled}
                  onClick={() => set({ headline: { ...headline, enabled: !headline.enabled } })}
                  className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", headline.enabled ? "bg-teal-400" : "bg-white/15")}
                >
                  <span className={cn("absolute top-0.5 size-4 rounded-full bg-white shadow transition-[left] duration-150", headline.enabled ? "left-[18px]" : "left-0.5")} />
                </button>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">Shows the clip title as a banner at the top.</p>
              {headline.enabled ? (
                <div className="mt-2.5 flex items-center gap-2">
                  {HEADLINE_BGS.map((bg) => (
                    <button
                      key={bg}
                      type="button"
                      aria-label={`Headline background ${bg}`}
                      onClick={() => set({ headline: { ...headline, bg, color: textOn(bg) } })}
                      className={cn(
                        "grid h-8 w-12 place-items-center rounded-lg border text-[8px] font-extrabold uppercase transition-all",
                        headline.bg === bg ? "border-teal-400 ring-1 ring-teal-400" : "border-white/15 hover:border-white/35",
                      )}
                      style={{ background: bg, color: textOn(bg) }}
                    >
                      Abc
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {/* phone preview */}
          <div className="hidden flex-col items-center justify-center gap-2 border-l border-white/10 bg-[#141414] p-4 md:flex">
            <span className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-muted-foreground">9:16</span>
            <div className="relative h-[340px] w-[192px] overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-600 via-slate-800 to-lime-900/60">
              <div className="absolute left-1/2 top-[22%] size-24 -translate-x-1/2 rounded-full bg-orange-200/20 blur-2xl" />
              {headline.enabled ? (
                <span
                  className="absolute inset-x-2 top-[6%] mx-auto w-fit max-w-full rounded px-2 py-1 text-center text-[9px] font-extrabold uppercase leading-tight"
                  style={{ background: headline.bg, color: headline.color }}
                >
                  Here is a line of headline
                </span>
              ) : null}
              <span className={cn("absolute inset-x-2 flex justify-center", css.middle ? "top-1/2 -translate-y-1/2" : "bottom-[14%]")}>
                <CaptionSample css={css} text="The five boxing wizards" />
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-white/10 p-4">
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm text-red-400/90 transition-colors hover:bg-red-400/10"
            >
              <Trash2 className="size-4" /> Delete
            </button>
          ) : null}
          <span className="flex-1" />
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-white/5">
            Cancel
          </button>
          <button
            type="button"
            disabled={!def.name.trim()}
            onClick={() => onSave({ id: initial?.id ?? crypto.randomUUID(), def: { ...def, name: def.name.trim() } })}
            className="rounded-xl bg-teal-400 px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-teal-300 disabled:opacity-50"
          >
            Save & use
          </button>
        </div>
      </div>
    </div>
  );
}
