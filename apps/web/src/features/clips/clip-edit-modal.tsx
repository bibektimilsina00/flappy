"use client";

import { Loader2, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  type ClipItem,
  type ClipsJob,
  type TranscriptSegment,
  rerenderClip,
} from "./api";

const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;

// Trim + caption editing for one clip. Apply re-renders just this clip.
export function ClipEditModal({
  job,
  clip,
  onClose,
  onSaved,
}: {
  job: ClipsJob;
  clip: ClipItem;
  onClose: () => void;
  onSaved: (job: ClipsJob) => void;
}) {
  const sourceDur = job.duration ?? clip.end + 15;
  // Trim window: the clip ± 15s of context, clamped to the source.
  const min = Math.max(0, clip.start - 15);
  const max = Math.min(sourceDur, clip.end + 15);
  const [start, setStart] = useState(clip.start);
  const [end, setEnd] = useState(clip.end);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Caption segments inside the (current) window, editable text.
  const baseSegments = useMemo<TranscriptSegment[]>(() => {
    if (clip.caption_edits?.length) return clip.caption_edits;
    return (job.transcript ?? []).filter((s) => s.end > min && s.start < max);
  }, [job.transcript, clip.caption_edits, min, max]);
  const [texts, setTexts] = useState<Record<number, string>>({});

  const visible = baseSegments
    .map((seg, i) => ({ ...seg, i }))
    .filter((seg) => seg.end > start && seg.start < end);

  const apply = async () => {
    setBusy(true);
    setError(null);
    try {
      const edited = Object.keys(texts).length
        ? baseSegments
            .map((seg, i) => ({ start: seg.start, end: seg.end, text: texts[i] ?? seg.text }))
            .filter((seg) => seg.end > start && seg.start < end && seg.text.trim())
        : undefined;
      const updated = await rerenderClip(job.id, clip.id, {
        start,
        end,
        ...(edited ? { caption_edits: edited } : {}),
      });
      onSaved(updated);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not apply changes");
      setBusy(false);
    }
  };

  const captionsOn = (job.params as { captions?: boolean }).captions !== false;

  return (
    <div className="dark fixed inset-0 z-[200] grid place-items-center bg-black/80 p-6" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-white/10 bg-[#1a1a1a] text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <h3 className="text-sm font-semibold">Edit clip · {clip.title}</h3>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5 [scrollbar-width:thin]">
          {clip.url ? (
            // biome-ignore lint/a11y/useMediaCaption: clip preview
            <video src={clip.url} controls className="mx-auto max-h-64 rounded-lg bg-black" />
          ) : null}

          {/* Trim */}
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">Trim</span>
              <span className="text-muted-foreground">
                {fmt(start)} → {fmt(end)} · {(end - start).toFixed(1)}s
              </span>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="w-8">Start</span>
                <input
                  type="range"
                  min={min}
                  max={end - 3}
                  step={0.1}
                  value={start}
                  onChange={(e) => setStart(Math.min(Number(e.target.value), end - 3))}
                  className="flex-1 accent-teal-400"
                />
              </label>
              <label className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="w-8">End</span>
                <input
                  type="range"
                  min={start + 3}
                  max={max}
                  step={0.1}
                  value={end}
                  onChange={(e) => setEnd(Math.max(Number(e.target.value), start + 3))}
                  className="flex-1 accent-teal-400"
                />
              </label>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground/60">
              Drag to nudge the boundaries — up to 15s beyond the original cut.
            </p>
          </div>

          {/* Captions */}
          {captionsOn ? (
            <div>
              <p className="mb-2 text-sm font-medium">Captions</p>
              {visible.length === 0 ? (
                <p className="text-xs text-muted-foreground">No speech inside the current trim.</p>
              ) : (
                <div className="space-y-1.5">
                  {visible.map((seg) => (
                    <div key={seg.i} className="flex items-start gap-2">
                      <span className="w-14 shrink-0 pt-2 text-right text-[11px] text-muted-foreground">
                        {fmt(Math.max(seg.start, start) - start)}
                      </span>
                      <textarea
                        value={texts[seg.i] ?? seg.text}
                        onChange={(e) => setTexts((t) => ({ ...t, [seg.i]: e.target.value }))}
                        rows={1}
                        className="min-h-9 flex-1 resize-y rounded-lg bg-white/5 px-3 py-2 text-sm outline-none focus:bg-white/10"
                      />
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-1.5 text-[11px] text-muted-foreground/60">
                Fix typos here — edits re-render into the burned captions.
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/10 px-5 py-3">
          <span className="text-xs text-red-400">{error}</span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-white/5">
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void apply()}
              className="flex items-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Apply & re-render
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
