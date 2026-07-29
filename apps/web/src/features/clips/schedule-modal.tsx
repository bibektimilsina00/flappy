"use client";

import { Calendar, Minus, Plus, X } from "lucide-react";
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

  return (
    <div className="dark fixed inset-0 z-[200] grid place-items-center bg-black/80 p-6" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-white/10 bg-[#1a1a1a] text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h3 className="text-lg font-bold">Auto schedule settings</h3>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5 [scrollbar-width:thin]">
          {/* clip selection */}
          <div>
            <p className="mb-2 text-sm font-medium">Clips selection</p>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={cfg.min_score !== null}
                onChange={(e) => set({ min_score: e.target.checked ? 70 : null })}
                className="size-4 accent-teal-400"
              />
              Only schedule clips with a score above
              <select
                disabled={cfg.min_score === null}
                value={String(cfg.min_score ?? 70)}
                onChange={(e) => set({ min_score: Number(e.target.value) })}
                className="rounded-lg border border-white/10 bg-[#161616] px-2 py-1 text-sm outline-none disabled:opacity-40"
              >
                {[60, 70, 80, 90].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* frequency */}
          <div>
            <p className="mb-2 text-sm font-medium">Post frequency per day</p>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={1}
                max={10}
                value={cfg.per_day}
                onChange={(e) => set({ per_day: Number(e.target.value) })}
                className="h-1.5 flex-1 cursor-pointer accent-teal-400"
              />
              <div className="flex items-center gap-1 rounded-xl border border-white/10 px-1 py-0.5">
                <button type="button" aria-label="Fewer" onClick={() => set({ per_day: Math.max(1, cfg.per_day - 1) })} className="grid size-7 place-items-center rounded-lg hover:bg-white/10">
                  <Minus className="size-3.5" />
                </button>
                <span className="w-6 text-center text-sm font-semibold tabular-nums">{cfg.per_day}</span>
                <button type="button" aria-label="More" onClick={() => set({ per_day: Math.min(10, cfg.per_day + 1) })} className="grid size-7 place-items-center rounded-lg hover:bg-white/10">
                  <Plus className="size-3.5" />
                </button>
              </div>
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
              <span>1 clip</span>
              <span>10 clips</span>
            </div>
          </div>

          {/* duration mode */}
          <div>
            <p className="mb-2 text-sm font-medium">Post schedule</p>
            <div className="space-y-2">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input type="radio" checked={cfg.mode === "all"} onChange={() => set({ mode: "all" })} className="size-4 accent-teal-400" />
                Until all clips are posted
              </label>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input type="radio" checked={cfg.mode === "days"} onChange={() => set({ mode: "days" })} className="size-4 accent-teal-400" />
                Post for
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={cfg.days}
                  disabled={cfg.mode !== "days"}
                  onChange={(e) => set({ days: Math.max(1, Math.min(60, Number(e.target.value) || 1)) })}
                  className="w-16 rounded-lg border border-white/10 bg-[#161616] px-2 py-1 text-center text-sm outline-none disabled:opacity-40"
                />
                days
              </label>
            </div>
          </div>

          {/* start date */}
          <div>
            <p className="mb-2 text-sm font-medium">Post start date</p>
            <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#161616] px-3 py-2.5">
              <Calendar className="size-4 text-muted-foreground" />
              <input
                type="date"
                value={cfg.start_date}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => set({ start_date: e.target.value })}
                className="flex-1 bg-transparent text-sm outline-none [color-scheme:dark]"
              />
            </label>
          </div>

          {/* window */}
          <div>
            <p className="mb-2 text-sm font-medium">Time to post</p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <select
                value={cfg.window_start}
                onChange={(e) => set({ window_start: e.target.value })}
                className="rounded-xl border border-white/10 bg-[#161616] px-3 py-2.5 outline-none"
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {hourLabel(h)}
                  </option>
                ))}
              </select>
              <span className="text-muted-foreground">to</span>
              <select
                value={cfg.window_end}
                onChange={(e) => set({ window_end: e.target.value })}
                className="rounded-xl border border-white/10 bg-[#161616] px-3 py-2.5 outline-none"
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {hourLabel(h)}
                  </option>
                ))}
              </select>
              <span className="rounded-xl border border-white/10 bg-[#161616] px-3 py-2.5 text-muted-foreground">
                {cfg.tz}
              </span>
            </div>
            {cfg.window_end <= cfg.window_start ? (
              <p className="mt-1.5 text-xs text-amber-300">End time must be after the start time.</p>
            ) : null}
          </div>

          <p className="rounded-xl bg-white/5 px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
            At each post's time it becomes <span className="text-teal-300">ready to post</span> in your queue.
            Direct auto-posting to TikTok/YouTube arrives with connected accounts.
          </p>
        </div>

        <div className="border-t border-white/10 p-4">
          <button
            type="button"
            disabled={cfg.window_end <= cfg.window_start}
            onClick={() => {
              onSave({ ...cfg, enabled: true });
              onClose();
            }}
            className={cn(
              "w-full rounded-xl bg-teal-400 py-3 text-sm font-semibold text-black transition-colors hover:bg-teal-300 disabled:opacity-50",
            )}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
