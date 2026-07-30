"use client";

import { Calendar, Globe, Minus, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/cn";
import { listSocialAccounts, type ScheduleConfig, type SocialAccount } from "./api";

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
    account_ids: [],
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
  const [accounts, setAccounts] = useState<SocialAccount[] | null>(null);
  const set = (patch: Partial<ScheduleConfig>) => setCfg((c) => ({ ...c, ...patch }));
  const windowInvalid = cfg.window_end <= cfg.window_start;

  useEffect(() => {
    listSocialAccounts().then(setAccounts).catch(() => setAccounts([]));
  }, []);

  const toggleAccount = (id: string) =>
    set({
      account_ids: (cfg.account_ids ?? []).includes(id)
        ? (cfg.account_ids ?? []).filter((a) => a !== id)
        : [...(cfg.account_ids ?? []), id],
    });

  return (
    <div className="dark fixed inset-0 z-[200] grid place-items-center bg-black/80 p-4" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl border border-white/10 bg-[#191919] text-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-7 pt-6">
          <h3 className="text-xl font-bold">Auto schedule settings</h3>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-7 py-6 [scrollbar-width:thin]">
          {/* clips selection */}
          <section>
            <p className="mb-3 text-sm font-medium text-muted-foreground">Clips selection</p>
            <label className="flex items-center gap-3 text-[15px]">
              <Checkbox
                checked={cfg.min_score !== null}
                onCheckedChange={(v) => set({ min_score: v === true ? 70 : null })}
              />
              Only schedule clips with a score above
              <Select
                value={String(cfg.min_score ?? 70)}
                onValueChange={(v) => set({ min_score: Number(v) })}
                disabled={cfg.min_score === null}
              >
                <SelectTrigger className="w-20 border-white/10 bg-transparent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark">
                  {[60, 70, 80, 90].map((v) => (
                    <SelectItem key={v} value={String(v)}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </section>

          {/* frequency */}
          <section>
            <p className="mb-3 text-sm font-medium text-muted-foreground">Post frequency per day</p>
            <div className="flex items-center gap-6">
              <Slider
                min={1}
                max={10}
                step={1}
                ticks={10}
                value={[cfg.per_day]}
                onValueChange={([v]) => set({ per_day: v })}
                className="flex-1"
              />
              <div className="flex items-center gap-1 rounded-xl border border-white/10 px-1.5 py-1">
                <button
                  type="button"
                  aria-label="Fewer posts"
                  onClick={() => set({ per_day: Math.max(1, cfg.per_day - 1) })}
                  className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
                >
                  <Minus className="size-4" />
                </button>
                <span className="w-7 text-center text-base font-semibold tabular-nums">{cfg.per_day}</span>
                <button
                  type="button"
                  aria-label="More posts"
                  onClick={() => set({ per_day: Math.min(10, cfg.per_day + 1) })}
                  className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>
            <div className="mt-2 flex justify-between pr-[120px] text-sm text-muted-foreground">
              <span>1 clip</span>
              <span>10 clips</span>
            </div>
          </section>

          {/* schedule mode */}
          <section>
            <p className="mb-3 text-sm font-medium text-muted-foreground">Post schedule</p>
            <RadioGroup
              value={cfg.mode}
              onValueChange={(v) => set({ mode: v as ScheduleConfig["mode"] })}
              className="gap-4"
            >
              <label className="flex cursor-pointer items-center gap-3 text-[15px]">
                <RadioGroupItem value="all" />
                Until all clips are posted
              </label>
              <label className="flex cursor-pointer items-center gap-3 text-[15px]">
                <RadioGroupItem value="days" />
                Post for
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={cfg.days}
                  onChange={(e) => set({ mode: "days", days: Math.max(1, Math.min(60, Number(e.target.value) || 1)) })}
                  className="w-16 rounded-lg border border-white/15 bg-transparent px-2 py-1.5 text-center text-sm outline-none transition-colors focus:border-teal-400/60"
                />
                days
              </label>
            </RadioGroup>
          </section>

          {/* start date */}
          <section>
            <p className="mb-3 text-sm font-medium text-muted-foreground">Post start date</p>
            <label className="flex items-center gap-3 rounded-xl border border-white/10 px-4 py-3 transition-colors focus-within:border-teal-400/50">
              <Calendar className="size-4 shrink-0 text-muted-foreground" />
              <input
                type="date"
                value={cfg.start_date}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => set({ start_date: e.target.value })}
                className="flex-1 bg-transparent text-[15px] outline-none [color-scheme:dark]"
              />
            </label>
          </section>

          {/* time window */}
          <section>
            <p className="mb-3 text-sm font-medium text-muted-foreground">Time to post</p>
            <div className="flex flex-wrap items-center gap-3">
              <Select value={cfg.window_start} onValueChange={(v) => set({ window_start: v })}>
                <SelectTrigger className="w-36 border-white/10 bg-transparent py-5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark max-h-64">
                  {HOURS.map((h) => (
                    <SelectItem key={h} value={h}>
                      {hourLabel(h)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground">to</span>
              <Select value={cfg.window_end} onValueChange={(v) => set({ window_end: v })}>
                <SelectTrigger className="w-36 border-white/10 bg-transparent py-5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark max-h-64">
                  {HOURS.map((h) => (
                    <SelectItem key={h} value={h}>
                      {hourLabel(h)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-[15px] text-muted-foreground">
                <Globe className="size-4" />
                {cfg.tz.split("/").pop()?.replace("_", " ")}
              </span>
            </div>
            {windowInvalid ? <p className="mt-2 text-sm text-amber-300">End time must be after the start time.</p> : null}
          </section>

          {/* auto-post targets */}
          {accounts && accounts.length > 0 ? (
            <section>
              <p className="mb-3 text-sm font-medium text-muted-foreground">Auto-post to</p>
              <div className="flex flex-wrap gap-2">
                {accounts.map((a) => {
                  const on = (cfg.account_ids ?? []).includes(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggleAccount(a.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3.5 text-sm font-medium transition-colors",
                        on
                          ? "border-teal-400/60 bg-teal-400/10 text-teal-200"
                          : "border-white/10 text-muted-foreground hover:border-white/25 hover:text-foreground",
                      )}
                    >
                      {a.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.avatar_url} alt="" className="size-6 rounded-full object-cover" />
                      ) : (
                        <span className="grid size-6 place-items-center rounded-full bg-white/10 text-[10px] capitalize">
                          {(a.username ?? a.platform).slice(0, 1)}
                        </span>
                      )}
                      {a.username ?? a.platform}
                      <span className="text-[11px] capitalize text-muted-foreground">{a.platform}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          <p className="text-sm leading-relaxed text-muted-foreground">
            {(cfg.account_ids ?? []).length > 0 ? (
              <>Posts publish <span className="text-teal-300">automatically</span> to the selected accounts at their time.</>
            ) : (
              <>At each post's time it becomes <span className="text-teal-300">ready to post</span> in your queue — pick
              connected accounts above to auto-post instead.</>
            )}
          </p>
        </div>

        <div className="px-7 pb-6">
          <button
            type="button"
            disabled={windowInvalid}
            onClick={() => {
              onSave({ ...cfg, enabled: true });
              onClose();
            }}
            className="w-full rounded-xl bg-teal-400 py-3.5 text-[15px] font-semibold text-black transition-colors hover:bg-teal-300 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
