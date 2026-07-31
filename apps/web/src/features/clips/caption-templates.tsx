"use client";

import { AlignCenter, AlignLeft, AlignRight, ArrowLeft, Bold, Check, ChevronLeft, ChevronRight, Italic, Minus, Pencil, Plus, Trash2, Underline, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
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
    const fonts = { inter: "PoppinsCap, sans-serif", poppins: "PoppinsCap, sans-serif", anton: "Anton, sans-serif", bangers: "Bangers, cursive" };
    const strokeW = custom.stroke?.width ?? 0;
    const shadows = [
      custom.shadow ? "2px 2px 4px rgba(0,0,0,0.85)" : null,
      !custom.box && !custom.shadow && strokeW === 0 ? "0 1px 3px rgba(0,0,0,0.9)" : null,
    ].filter(Boolean);
    return {
      base: {
        color: custom.color,
        fontFamily: fonts[custom.font ?? "inter"],
        fontSize: px(custom.size_px ? custom.size_px * 0.72 : (SIZE_PX[custom.size] ?? 12)),
        fontWeight: custom.bold ? 700 : 500,
        fontStyle: custom.italic ? "italic" : "normal",
        textDecoration: custom.underline ? "underline" : "none",
        letterSpacing: custom.spacing ? `${custom.spacing * 0.5}px` : undefined,
        textAlign: custom.align ?? "center",
        textTransform: custom.uppercase ? "uppercase" : "none",
        textShadow: shadows.length ? shadows.join(", ") : undefined,
        WebkitTextStroke: strokeW > 0 && !custom.box ? `${strokeW * 0.35}px ${custom.stroke?.color ?? "#000"}` : undefined,
        background: custom.box ? `${custom.box_color ?? "#000000"}99` : undefined,
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

const LS_KEY = "riocut-caption-templates";

export function loadTemplates(): UserTemplate[] {
  try {
    // rebrand migration: fall back to the older-era keys
    return JSON.parse(
      localStorage.getItem(LS_KEY) ??
        localStorage.getItem("kinomill-caption-templates") ??
        localStorage.getItem("flappy-caption-templates") ??
        "[]",
    );
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
      className={cn("max-w-full text-center leading-snug", css.boxed && "rounded px-1.5 py-0.5", css.boxed && !css.base.background && "bg-black/60")}
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

// Real footage stand-in so previews look like actual clips (mirrors the
// marketing site's stock imagery).
const PREVIEW_IMG =
  "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=600&q=80";
const RATIO_DIMS: Record<string, [number, number]> = {
  "9:16": [148, 250],
  "1:1": [210, 210],
  "16:9": [300, 169],
};

export function CaptionStylePicker({
  captions,
  style,
  custom,
  headline,
  ratio = "9:16",
  layout = "fit",
  watermark = false,
  onChange,
}: {
  captions: boolean;
  style: string;
  custom: CustomCaptionStyle | null;
  headline?: { bg: string; color: string; text?: string } | null;
  ratio?: string;
  layout?: string;
  watermark?: boolean;
  onChange: (patch: { captions: boolean; caption_style?: string; caption_custom?: CustomCaptionStyle | null }) => void;
}) {
  const [tab, setTab] = useState<"featured" | "mine">("featured");
  const [templates, setTemplates] = useState<UserTemplate[]>([]);
  const [editing, setEditing] = useState<UserTemplate | "new" | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState({ left: false, right: false });

  const updateArrows = () => {
    const el = rowRef.current;
    if (!el) return;
    setCanScroll({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: content width changes with tab/templates
  useEffect(() => {
    updateArrows();
    window.addEventListener("resize", updateArrows);
    return () => window.removeEventListener("resize", updateArrows);
  }, [tab, templates]);

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

  // Card mirrors the render: chosen ratio shapes the card; fit letterboxes
  // the footage with title/captions in the bars, fill covers the frame.
  const [cw, ch] = RATIO_DIMS[ratio] ?? RATIO_DIMS["9:16"];
  const videoFrac = Math.min(1, (cw * 9) / 16 / ch);
  const fitMode = layout !== "fill" && videoFrac < 0.96;
  const topBar = (1 - videoFrac) / 2;

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
      style={{ width: cw, height: ch }}
      className={cn(
        "group relative shrink-0 snap-start overflow-hidden rounded-2xl border-2 text-left transition-all",
        active ? "border-teal-400 shadow-[0_0_20px_-6px_rgba(45,212,191,0.5)]" : "border-white/10 hover:border-white/30",
      )}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br", bg)} />
      {fitMode ? (
        // biome-ignore lint/a11y/useAltText: decorative preview footage
        // biome-ignore lint/nursery/noImgElement: static preview image
        <img
          src={PREVIEW_IMG}
          className="absolute left-0 w-full object-cover"
          style={{ top: `${topBar * 100}%`, height: `${videoFrac * 100}%` }}
        />
      ) : (
        <>
          {/* biome-ignore lint/a11y/useAltText: decorative preview footage */}
          {/* biome-ignore lint/nursery/noImgElement: static preview image */}
          <img src={PREVIEW_IMG} className="absolute inset-0 size-full object-cover" />
          <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60", bg)} />
        </>
      )}
      {active ? (
        <span className="absolute left-2 top-2 z-10 grid size-6 place-items-center rounded-full bg-teal-400 text-black">
          <Check className="size-3.5" />
        </span>
      ) : null}
      {watermark ? (
        // Mirrors the free-plan render watermark (top-left, subtle).
        <span
          className="pointer-events-none absolute z-[6] text-[7px] font-semibold text-white/60 [text-shadow:1px_1px_2px_rgba(0,0,0,0.6)]"
          style={fitMode ? { left: "5%", top: `calc(${topBar * 100}% + 5px)` } : { left: "5%", top: "3%" }}
        >
          riocut.com
        </span>
      ) : null}
      {headline ? (
        <span
          className={cn(
            "absolute inset-x-2 z-[5] mx-auto w-fit max-w-full truncate rounded px-1.5 py-0.5 text-center text-[8px] font-extrabold uppercase",
            headline.bg === "none" && "[text-shadow:0_1px_2px_rgba(0,0,0,0.9)]",
          )}
          style={{
            top: fitMode ? `${topBar * 35}%` : 10,
            background: headline.bg === "none" ? "transparent" : headline.bg,
            color: headline.color,
          }}
        >
          {headline.text?.trim() || "Your clip title"}
        </span>
      ) : null}
      {css ? (
        <span
          className={cn(
            "absolute inset-x-2 flex justify-center",
            !fitMode && (css.middle ? "top-1/2 -translate-y-1/2" : "bottom-14"),
          )}
          style={fitMode ? { top: `${(0.5 + videoFrac / 2) * 100 + 2}%` } : undefined}
        >
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
      {/* segmented tabs */}
      <div className="mb-3 inline-flex rounded-xl border border-white/10 bg-black/30 p-1">
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
              "rounded-lg px-4 py-1.5 text-sm transition-colors",
              tab === t.id
                ? "bg-teal-400/15 font-medium text-teal-300"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="relative">
        {canScroll.left ? (
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => rowRef.current?.scrollBy({ left: -320, behavior: "smooth" })}
            className="absolute -left-9 top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-[#222] text-foreground/80 shadow-xl transition-colors hover:bg-[#2e2e2e] hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
          </button>
        ) : null}
        {canScroll.right ? (
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => rowRef.current?.scrollBy({ left: 320, behavior: "smooth" })}
            className="absolute -right-9 top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-[#222] text-foreground/80 shadow-xl transition-colors hover:bg-[#2e2e2e] hover:text-foreground"
          >
            <ChevronRight className="size-4" />
          </button>
        ) : null}
        <div ref={rowRef} onScroll={updateArrows} className="flex snap-x gap-3 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
      layout: "auto",
      bg: "#000000",
      logo: null,
      subtitles: true,
      headline: { enabled: false, bg: "#FFFFFF", color: "#000000" },
    },
  );
  const [advanced, setAdvanced] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<CustomCaptionStyle>) => setDef((d) => ({ ...d, ...patch }));
  const css = captionCss("custom", def, 1.1);
  const headline = def.headline ?? { enabled: false, bg: "#FFFFFF", color: "#000000" };
  const subtitlesOn = def.subtitles !== false;

  const onLogoFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 400 * 1024) {
      setLogoError("Logo must be under 400 KB.");
      return;
    }
    setLogoError(null);
    const reader = new FileReader();
    reader.onload = () => set({ logo: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const SectionSwitch = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", checked ? "bg-teal-400" : "bg-white/15")}
    >
      <span className={cn("absolute top-0.5 size-4 rounded-full bg-white shadow transition-[left] duration-150", checked ? "left-[18px]" : "left-0.5")} />
    </button>
  );

  return (
    <div className="dark fixed inset-0 z-[210] grid place-items-center bg-black/80 p-4" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl border border-white/10 bg-[#1a1a1a] text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h3 className="text-lg font-bold">{initial ? "Edit template" : "New template"}</h3>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 md:grid-cols-[1fr_280px]">
          {/* controls */}
          <div className="min-h-0 space-y-6 overflow-y-auto p-6 [scrollbar-width:thin]">
            {advanced ? (
              <AdvancedPanel def={def} set={set} onBack={() => setAdvanced(false)} />
            ) : (
            <>
            <input
              value={def.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="Template name"
              className="w-full rounded-xl border border-white/10 bg-[#161616] px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-teal-400/50"
            />

            {/* layout */}
            <div>
              <p className="mb-2.5 text-sm font-semibold">Layout</p>
              <div className="flex gap-2">
                {(
                  [
                    ["auto", "Auto", "Face-aware crop"],
                    ["fill", "Fill", "Center crop"],
                    ["fit", "Fit", "Letterbox on colour"],
                  ] as const
                ).map(([id, label, hint]) => (
                  <button
                    key={id}
                    type="button"
                    title={hint}
                    onClick={() => set({ layout: id })}
                    className={cn(
                      "flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                      (def.layout ?? "auto") === id
                        ? "border-teal-400 bg-teal-400/10 text-teal-300"
                        : "border-white/10 text-muted-foreground hover:border-white/25 hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {def.layout === "fit" ? (
                <label className="mt-2.5 flex items-center gap-3 text-sm text-muted-foreground">
                  Background
                  <input
                    type="color"
                    value={def.bg ?? "#000000"}
                    onChange={(e) => set({ bg: e.target.value })}
                    className="h-8 w-14 cursor-pointer rounded-lg border border-white/10 bg-[#161616] p-1"
                  />
                </label>
              ) : null}
            </div>

            {/* subtitles */}
            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Subtitles</p>
                <SectionSwitch checked={subtitlesOn} onChange={() => set({ subtitles: !subtitlesOn })} />
              </div>
              {subtitlesOn ? (
                <div className="mt-3 space-y-3">
                  <label className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <Checkbox
                      checked={def.position !== "middle"}
                      onCheckedChange={(v) => set({ position: v === true ? "bottom" : "middle" })}
                    />
                    Auto position (bottom)
                  </label>
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
                    onClick={() => setAdvanced(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 py-2.5 text-sm text-foreground/90 transition-colors hover:bg-white/10"
                  >
                    <Pencil className="size-3.5" />
                    Advanced settings
                  </button>
                </div>
              ) : null}
            </div>

            {/* headline */}
            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Headline</p>
                <SectionSwitch
                  checked={headline.enabled}
                  onChange={() => set({ headline: { ...headline, enabled: !headline.enabled } })}
                />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">Shows the clip title as a banner at the top.</p>
              {headline.enabled ? (
                <div className="mt-3 flex gap-2">
                  {(
                    [
                      { id: "black", bg: "#000000", color: "#FFFFFF" },
                      { id: "white", bg: "#FFFFFF", color: "#000000" },
                      { id: "yellow", bg: "none", color: "#FFD700" },
                    ] as const
                  ).map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => set({ headline: { ...headline, bg: v.bg, color: v.color } })}
                      className={cn(
                        "flex-1 rounded-lg border px-2 py-2.5 text-center text-[11px] font-extrabold transition-all",
                        headline.bg === v.bg && headline.color === v.color
                          ? "border-teal-400 ring-1 ring-teal-400"
                          : "border-white/10 hover:border-white/30",
                      )}
                    >
                      <span
                        className={cn("rounded px-2 py-1", v.bg === "none" && "[text-shadow:0_1px_2px_rgba(0,0,0,0.9)]")}
                        style={{ background: v.bg === "none" ? "transparent" : v.bg, color: v.color }}
                      >
                        Lorem ipsum
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {/* logo */}
            <div>
              <p className="mb-1 text-sm font-semibold">Logo</p>
              <p className="mb-2.5 text-xs text-muted-foreground">Overlaid top-right on every exported clip.</p>
              <input
                ref={logoRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  onLogoFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              {def.logo ? (
                <div className="flex items-center gap-3">
                  <span className="grid h-14 w-24 place-items-center overflow-hidden rounded-lg border border-white/10 bg-[#0f0f0f] p-1.5">
                    {/* biome-ignore lint/a11y/useAltText: template logo */}
                    <img src={def.logo} className="max-h-full max-w-full object-contain" />
                  </span>
                  <button
                    type="button"
                    onClick={() => set({ logo: null })}
                    className="rounded-lg px-3 py-2 text-xs text-red-400/90 transition-colors hover:bg-red-400/10"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => logoRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/15 py-3.5 text-sm text-muted-foreground transition-colors hover:border-teal-400/50 hover:text-teal-300"
                >
                  <Plus className="size-4" /> Add
                </button>
              )}
              {logoError ? <p className="mt-1.5 text-xs text-amber-300">{logoError}</p> : null}
            </div>
            </>
            )}
          </div>

          {/* phone preview */}
          <div className="hidden flex-col items-center justify-center gap-2 border-l border-white/10 bg-[#141414] p-4 md:flex">
            <span className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-muted-foreground">9:16</span>
            <div
              className="relative h-[360px] w-[203px] overflow-hidden rounded-2xl border border-white/10"
              style={{ background: def.layout === "fit" ? (def.bg ?? "#000") : undefined }}
            >
              <div
                className={cn(
                  "absolute bg-gradient-to-b from-slate-600 via-slate-800 to-lime-900/60",
                  def.layout === "fit" ? "inset-x-0 top-1/2 aspect-video -translate-y-1/2" : "inset-0",
                )}
              >
                <div className="absolute left-1/2 top-[30%] size-20 -translate-x-1/2 rounded-full bg-orange-200/20 blur-2xl" />
              </div>
              {def.logo ? (
                // biome-ignore lint/a11y/useAltText: logo preview
                <img src={def.logo} className="absolute right-[5%] top-[3%] w-1/5 object-contain" />
              ) : null}
              {headline.enabled ? (
                <span
                  className={cn(
                    "absolute inset-x-2 top-[7%] mx-auto w-fit max-w-full rounded px-2 py-1 text-center text-[9px] font-extrabold uppercase leading-tight",
                    headline.bg === "none" && "[text-shadow:0_1px_2px_rgba(0,0,0,0.95)]",
                  )}
                  style={{ background: headline.bg === "none" ? "transparent" : headline.bg, color: headline.color }}
                >
                  Here is a line of headline
                </span>
              ) : null}
              {subtitlesOn ? (
                <span className={cn("absolute inset-x-2 flex justify-center", css.middle ? "top-1/2 -translate-y-1/2" : "bottom-[13%]")}>
                  <CaptionSample css={css} text="The five boxing wizards" />
                </span>
              ) : null}
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


// Vizard-style advanced typography panel (sub-view of the template editor).
function AdvancedPanel({
  def,
  set,
  onBack,
}: {
  def: CustomCaptionStyle;
  set: (patch: Partial<CustomCaptionStyle>) => void;
  onBack: () => void;
}) {
  const strokeOn = (def.stroke?.width ?? 0) > 0;
  const highlightOn = def.highlight !== def.color;
  const Tool = ({
    active,
    label,
    onClick,
    children,
  }: {
    active?: boolean;
    label: string;
    onClick: () => void;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "grid size-9 place-items-center rounded-lg text-sm transition-colors",
        active ? "bg-white/15 text-foreground" : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
  const Row = ({ label, action, children }: { label: string; action: React.ReactNode; children?: React.ReactNode }) => (
    <div className="border-t border-white/[0.07] py-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{label}</p>
        {action}
      </div>
      {children}
    </div>
  );

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-5 flex items-center gap-2 text-[15px] font-semibold transition-colors hover:text-teal-300"
      >
        <ArrowLeft className="size-4" /> Advanced settings
      </button>

      {/* basic */}
      <p className="mb-2.5 text-sm font-medium text-muted-foreground">Basic</p>
      <select
        value={def.font === "inter" || !def.font ? "poppins" : def.font}
        onChange={(e) => set({ font: e.target.value as CustomCaptionStyle["font"] })}
        className="mb-2.5 w-full rounded-xl border border-white/10 bg-[#161616] px-4 py-3 text-sm font-semibold outline-none"
        style={{ fontFamily: { inter: "PoppinsCap", poppins: "PoppinsCap", anton: "Anton", bangers: "Bangers" }[def.font ?? "poppins"] }}
      >
        <option value="poppins">Poppins</option>
        <option value="anton">Anton</option>
        <option value="bangers">Bangers</option>
      </select>

      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <select
          value={String(def.size_px ?? 16)}
          onChange={(e) => set({ size_px: Number(e.target.value) })}
          className="rounded-xl border border-white/10 bg-[#161616] px-3 py-2 text-sm outline-none"
        >
          {[13, 15, 17, 19, 22, 25, 28].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <span className="flex rounded-xl border border-white/10 bg-[#161616] p-0.5">
          <Tool active={(def.align ?? "center") === "left"} label="Align left" onClick={() => set({ align: "left" })}>
            <AlignLeft className="size-4" />
          </Tool>
          <Tool active={(def.align ?? "center") === "center"} label="Align center" onClick={() => set({ align: "center" })}>
            <AlignCenter className="size-4" />
          </Tool>
          <Tool active={(def.align ?? "center") === "right"} label="Align right" onClick={() => set({ align: "right" })}>
            <AlignRight className="size-4" />
          </Tool>
        </span>
        <span className="flex rounded-xl border border-white/10 bg-[#161616] p-0.5">
          <Tool active={def.bold} label="Bold" onClick={() => set({ bold: !def.bold })}>
            <Bold className="size-4" />
          </Tool>
          <Tool active={def.italic} label="Italic" onClick={() => set({ italic: !def.italic })}>
            <Italic className="size-4" />
          </Tool>
          <Tool active={def.underline} label="Underline" onClick={() => set({ underline: !def.underline })}>
            <Underline className="size-4" />
          </Tool>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="flex rounded-xl border border-white/10 bg-[#161616] p-0.5">
          <Tool active={!def.uppercase} label="Normal case" onClick={() => set({ uppercase: false })}>
            Aa
          </Tool>
          <Tool active={def.uppercase} label="Uppercase" onClick={() => set({ uppercase: true })}>
            AB
          </Tool>
        </span>
        <label className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#161616] px-3 py-2 text-sm text-muted-foreground">
          <span className="underline">A</span>
          <select
            value={String(def.spacing ?? 0)}
            onChange={(e) => set({ spacing: Number(e.target.value) })}
            className="bg-transparent text-foreground outline-none"
          >
            {[0, 1, 2, 4].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="grid size-9 cursor-pointer place-items-center rounded-full border border-white/15">
          <input
            type="color"
            value={def.color}
            onChange={(e) => set({ color: e.target.value })}
            className="size-6 cursor-pointer rounded-full border-none bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-none"
          />
        </label>
      </div>

      <div className="mt-4 border-t border-white/[0.07] pt-4">
        <select
          value={String(def.words_per_line ?? 4)}
          onChange={(e) => set({ words_per_line: Number(e.target.value) })}
          className="w-full rounded-xl border border-white/10 bg-[#161616] px-4 py-3 text-sm outline-none"
        >
          <option value="2">Short lines — 2 words per screen</option>
          <option value="3">3 words per screen</option>
          <option value="4">1 line per screen</option>
          <option value="8">2 lines per screen</option>
        </select>
      </div>

      <div className="mt-2">
        <Row
          label="Shadow"
          action={
            <button
              type="button"
              aria-label={def.shadow ? "Remove shadow" : "Add shadow"}
              onClick={() => set({ shadow: !def.shadow })}
              className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            >
              {def.shadow ? <Minus className="size-4" /> : <Plus className="size-4" />}
            </button>
          }
        />
        <Row
          label="Stroke"
          action={
            <div className="flex items-center gap-2">
              {strokeOn ? (
                <>
                  <select
                    value={String(def.stroke?.width ?? 2)}
                    onChange={(e) => set({ stroke: { color: def.stroke?.color ?? "#000000", width: Number(e.target.value) } })}
                    className="rounded-lg border border-white/10 bg-[#161616] px-2 py-1.5 text-sm outline-none"
                  >
                    {[1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <input
                    type="color"
                    value={def.stroke?.color ?? "#000000"}
                    onChange={(e) => set({ stroke: { width: def.stroke?.width ?? 2, color: e.target.value } })}
                    className="size-8 cursor-pointer rounded-full border border-white/15 bg-transparent p-0.5 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-none"
                  />
                </>
              ) : null}
              <button
                type="button"
                aria-label={strokeOn ? "Remove stroke" : "Add stroke"}
                onClick={() => set({ stroke: strokeOn ? { width: 0, color: def.stroke?.color ?? "#000000" } : { width: 2, color: "#000000" } })}
                className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
              >
                {strokeOn ? <Minus className="size-4" /> : <Plus className="size-4" />}
              </button>
            </div>
          }
        />
        <Row
          label="Highlight"
          action={
            <div className="flex items-center gap-2">
              {highlightOn ? (
                <input
                  type="color"
                  value={def.highlight}
                  onChange={(e) => set({ highlight: e.target.value })}
                  className="size-8 cursor-pointer rounded-full border border-white/15 bg-transparent p-0.5 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-none"
                />
              ) : null}
              <button
                type="button"
                aria-label={highlightOn ? "Remove highlight" : "Add highlight"}
                onClick={() => set({ highlight: highlightOn ? def.color : "#2DD4BF" })}
                className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
              >
                {highlightOn ? <Minus className="size-4" /> : <Plus className="size-4" />}
              </button>
            </div>
          }
        />
        <Row
          label="Background"
          action={
            <div className="flex items-center gap-2">
              {def.box ? (
                <input
                  type="color"
                  value={def.box_color ?? "#000000"}
                  onChange={(e) => set({ box_color: e.target.value })}
                  className="size-8 cursor-pointer rounded-full border border-white/15 bg-transparent p-0.5 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-none"
                />
              ) : null}
              <button
                type="button"
                aria-label={def.box ? "Remove background" : "Add background"}
                onClick={() => set({ box: !def.box })}
                className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
              >
                {def.box ? <Minus className="size-4" /> : <Plus className="size-4" />}
              </button>
            </div>
          }
        />
      </div>
    </div>
  );
}
