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
        "group relative w-[104px] shrink-0 overflow-hidden rounded-xl border text-left transition-all",
        active ? "border-teal-400 ring-1 ring-teal-400" : "border-white/10 hover:border-white/25",
      )}
    >
      <div className={cn("relative h-[132px] w-full bg-gradient-to-br", bg)}>
        {active ? (
          <span className="absolute right-1.5 top-1.5 z-10 grid size-5 place-items-center rounded-full bg-teal-400 text-black">
            <Check className="size-3" />
          </span>
        ) : null}
        {css ? (
          <span className={cn("absolute inset-x-1 flex justify-center", css.middle ? "top-1/2 -translate-y-1/2" : "bottom-2.5")}>
            <CaptionSample css={css} />
          </span>
        ) : (
          <span className="absolute inset-0 grid place-items-center text-sm text-white/35">—</span>
        )}
        {extra}
      </div>
      <p className="truncate bg-black/40 px-2 py-1.5 text-[11px] font-medium">{name}</p>
    </button>
  );

  return (
    <div>
      <div className="mb-3 flex items-center gap-1 border-b border-white/10">
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
              "-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
              tab === t.id
                ? "border-teal-400 font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
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
              className="grid h-[164px] w-[104px] shrink-0 place-items-center rounded-xl border-2 border-dashed border-white/15 text-muted-foreground transition-colors hover:border-teal-400/50 hover:text-teal-300"
            >
              <span className="flex flex-col items-center gap-1.5 text-xs">
                <Plus className="size-5" />
                New template
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

// ── template editor modal ────────────────────────────────────────────────────

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
      name: "My style",
      color: "#FFFFFF",
      highlight: "#2DD4BF",
      size: "m",
      bold: true,
      uppercase: false,
      box: false,
      position: "bottom",
    },
  );
  const set = (patch: Partial<CustomCaptionStyle>) => setDef((d) => ({ ...d, ...patch }));
  const css = captionCss("custom", def, 1.1);

  return (
    <div className="dark fixed inset-0 z-[210] grid place-items-center bg-black/80 p-6" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl border border-white/10 bg-[#1a1a1a] text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h3 className="text-base font-bold">{initial ? "Edit template" : "New caption template"}</h3>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 [scrollbar-width:thin]">
          {/* live preview */}
          <div className="relative mx-auto h-40 w-24 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-slate-700 to-slate-950">
            <span className={cn("absolute inset-x-1 flex justify-center", css.middle ? "top-1/2 -translate-y-1/2" : "bottom-3")}>
              <CaptionSample css={css} />
            </span>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">Name</span>
            <input
              value={def.name}
              onChange={(e) => set({ name: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-[#161616] px-3 py-2 outline-none focus:border-teal-400/50"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Text color</span>
              <input
                type="color"
                value={def.color}
                onChange={(e) => set({ color: e.target.value })}
                className="h-10 w-full cursor-pointer rounded-xl border border-white/10 bg-[#161616] p-1"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Active word</span>
              <input
                type="color"
                value={def.highlight}
                onChange={(e) => set({ highlight: e.target.value })}
                className="h-10 w-full cursor-pointer rounded-xl border border-white/10 bg-[#161616] p-1"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Size</span>
              <select
                value={def.size}
                onChange={(e) => set({ size: e.target.value as CustomCaptionStyle["size"] })}
                className="w-full rounded-xl border border-white/10 bg-[#161616] px-3 py-2.5 outline-none"
              >
                <option value="s">Small</option>
                <option value="m">Medium</option>
                <option value="l">Large</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Position</span>
              <select
                value={def.position}
                onChange={(e) => set({ position: e.target.value as CustomCaptionStyle["position"] })}
                className="w-full rounded-xl border border-white/10 bg-[#161616] px-3 py-2.5 outline-none"
              >
                <option value="bottom">Bottom</option>
                <option value="middle">Middle</option>
              </select>
            </label>
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            {(
              [
                ["bold", "Bold"],
                ["uppercase", "UPPERCASE"],
                ["box", "Background box"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(def[key])}
                  onChange={(e) => set({ [key]: e.target.checked } as Partial<CustomCaptionStyle>)}
                  className="size-4 accent-teal-400"
                />
                {label}
              </label>
            ))}
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
