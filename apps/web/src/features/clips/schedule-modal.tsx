"use client";

import { Calendar, CalendarClock, Minus, Plus, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import type { ScheduleConfig } from "./api";

const HOURS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);
const hourLabel = (v: string) => {
  const h = Number(v.split(":")[0]);
  return h === 0 ? "12:00 AM" : h < 12 ? `${h}:00 AM` : h === 12 ? "12:00 PM" : `${h - 12}:00 PM`;
};

export function defaultSchedule(): ScheduleConfig {
  const tomorrow = new Date(Date.now() + 86400000);
  return {
    enabled: true,
    min_score: null,
    per_day: 3,
    mode: "all",
    days: 7,
    start_date: tomorrow.toISOString().slice(0, 10),
    window_start: "09:00",
    window_end: "19:00",
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  };
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
      <p className="text-sm font-semibold">{title}</p>
      {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
      <div className="mt-3">{children}</div>
    </div>
  );
}

export function ScheduleModal({
  value,
  onSave,
  onClose,
}: {
  value: ScheduleConfig;
  onSave: (cfg: ScheduleConfig) => void;
  onClose: () => void;
}) {
  const [cfg, setCfg] = useState<ScheduleConfig>(value);
  const set = (patch: Partial<ScheduleConfig>) => setCfg((c) => ({ ...c, ...patch }));
  const windowInvalid = cfg.window_end <= cfg.window_start;

  // preview: the next 7 days with their post slots
  const start = new Date(`${cfg.start_date}T00:00`);
  const previewDays = Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * 86400000));

  return (
    <div className="dark fixed inset-0 z-[200] grid place-items-center bg-black/80 p-4" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-2xl border border-white/10 bg-[#1a1a1a] text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h3 className="flex items-center gap-2 text-lg font-bold">
            <CalendarClock className="size-5 text-teal-300" /> Auto schedule
          </h3>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 [scrollbar-width:thin]">
          <Section title="Which clips" sub="Only queue clips scoring at least…">
            <div className="flex gap-1.5">
              {([null, 60, 70, 80, 90] as const).map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  onClick={() => set({ min_score: v })}
                  className={cn(
                    "flex-1 rounded-xl border py-2 text-sm font-medium transition-colors",
                    cfg.min_score === v
                      ? "border-teal-400 bg-teal-400/10 text-teal-300"
                      : "border-white/10 text-muted-foreground hover:border-white/25 hover:text-foreground",
                  )}
                >
                  {v === null ? "All" : `${v}+`}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Posts per day">
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={1}
                max={10}
                value={cfg.per_day}
                onChange={(e) => set({ per_day: Number(e.target.value) })}
                className="h-1.5 flex-1 cursor-pointer accent-teal-400"
              />
              <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/30 px-1 py-0.5">
                <button type="button" aria-label="Fewer" onClick={() => set({ per_day: Math.max(1, cfg.per_day - 1) })} className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-white/10 hover:text-foreground">
                  <Minus className="size-3.5" />
                </button>
                <span className="w-7 text-center text-base font-bold tabular-nums text-teal-300">{cfg.per_day}</span>
                <button type="button" aria-label="More" onClick={() => set({ per_day: Math.min(10, cfg.per_day + 1) })} className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-white/10 hover:text-foreground">
                  <Plus className="size-3.5" />
                </button>
              </div>
            </div>
          </Section>

          <Section title="How long">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => set({ mode: "all" })}
                className={cn(
                  "rounded-xl border px-3 py-3 text-left text-sm transition-colors",
                  cfg.mode === "all"
                    ? "border-teal-400 bg-teal-400/10"
                    : "border-white/10 hover:border-white/25",
                )}
              >
                <span className={cn("block font-medium", cfg.mode === "all" ? "text-teal-300" : "text-foreground")}>
                  Until done
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">Every clip gets posted</span>
              </button>
              <button
                type="button"
                onClick={() => set({ mode: "days" })}
                className={cn(
                  "rounded-xl border px-3 py-3 text-left text-sm transition-colors",
                  cfg.mode === "days"
                    ? "border-teal-400 bg-teal-400/10"
                    : "border-white/10 hover:border-white/25",
                )}
              >
                <span className={cn("flex items-center gap-1.5 font-medium", cfg.mode === "days" ? "text-teal-300" : "text-foreground")}>
                  For
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={cfg.days}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => set({ mode: "days", days: Math.max(1, Math.min(60, Number(e.target.value) || 1)) })}
                    className="w-12 rounded-lg border border-white/15 bg-black/30 px-1.5 py-0.5 text-center text-sm outline-none focus:border-teal-400/60"
                  />
                  days
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">Best clips first, then stop</span>
              </button>
            </div>
          </Section>

          <Section title="When">
            <div className="space-y-2.5">
              <label className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5">
                <Calendar className="size-4 shrink-0 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Starts</span>
                <input
                  type="date"
                  value={cfg.start_date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => set({ start_date: e.target.value })}
                  className="flex-1 bg-transparent text-sm outline-none [color-scheme:dark]"
                />
              </label>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <select
                  value={cfg.window_start}
                  onChange={(e) => set({ window_start: e.target.value })}
                  className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 outline-none"
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>
                      {hourLabel(h)}
                    </option>
                  ))}
                </select>
                <span className="text-muted-foreground">→</span>
                <select
                  value={cfg.window_end}
                  onChange={(e) => set({ window_end: e.target.value })}
                  className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 outline-none"
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>
                      {hourLabel(h)}
                    </option>
                  ))}
                </select>
                <span className="shrink-0 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-xs text-muted-foreground">
                  {cfg.tz.split("/").pop()?.replace("_", " ")}
                </span>
              </div>
              {windowInvalid ? (
                <p className="text-xs text-amber-300">End time must be after the start time.</p>
              ) : null}
            </div>
          </Section>

          {/* week preview */}
          <div className="rounded-2xl border border-teal-400/15 bg-teal-400/[0.04] p-4">
            <p className="mb-2.5 text-xs font-medium text-teal-300">
              {cfg.per_day} {cfg.per_day === 1 ? "post" : "posts"}/day · {hourLabel(cfg.window_start)}–{hourLabel(cfg.window_end)}
            </p>
            <div className="grid grid-cols-7 gap-1.5">
              {previewDays.map((d, i) => (
                <div key={d.toISOString()} className={cn("rounded-lg py-1.5 text-center", i === 0 ? "bg-teal-400/15" : "bg-white/[0.04]")}>
                  <p className="text-[10px] text-muted-foreground">{d.toLocaleDateString(undefined, { weekday: "short" })}</p>
                  <p className="text-xs font-semibold tabular-nums">{d.getDate()}</p>
                  <div className="mt-1 flex justify-center gap-0.5">
                    {Array.from({ length: Math.min(cfg.per_day, 5) }, (_, j) => (
                      <span key={`${d.toISOString()}-${j}`} className="size-1 rounded-full bg-teal-400/80" />
                    ))}
                    {cfg.per_day > 5 ? <span className="text-[8px] leading-none text-teal-300">+</span> : null}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2.5 text-[11px] leading-relaxed text-muted-foreground">
              Each post turns <span className="text-teal-300">ready to post</span> at its time. Direct auto-posting
              arrives with connected accounts.
            </p>
          </div>
        </div>

        <div className="border-t border-white/10 p-4">
          <button
            type="button"
            disabled={windowInvalid}
            onClick={() => {
              onSave({ ...cfg, enabled: true });
              onClose();
            }}
            className="w-full rounded-xl bg-teal-400 py-3 text-sm font-semibold text-black transition-colors hover:bg-teal-300 disabled:opacity-50"
          >
            Save schedule
          </button>
        </div>
      </div>
    </div>
  );
}
