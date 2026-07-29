"use client";

import { ChevronsLeft, ChevronsRight, Loader2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/cn";
import { type ClipItem, type ClipsJob, rerenderClip } from "./api";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}.${Math.floor((s % 1) * 10)}`;

// Vizard-style clip editor: source video + full transcript with the selected
// range highlighted; trim by transcript ("start/end here"), the range slider,
// or timecodes. In-range text is editable (burns as caption edits).
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
  const sourceDur = job.duration ?? clip.end + 30;
  const [start, setStart] = useState(clip.start);
  const [end, setEnd] = useState(clip.end);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [texts, setTexts] = useState<Record<number, string>>({});
  const [t, setT] = useState(clip.start);
  const videoRef = useRef<HTMLVideoElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const segments = useMemo(() => job.transcript ?? [], [job.transcript]);
  const firstInRange = segments.findIndex((s) => s.end > start && s.start < end);

  // open with the selection's first segment in view
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>("[data-in-range=true]");
    el?.scrollIntoView({ block: "center" });
    if (videoRef.current) videoRef.current.currentTime = start;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const seek = (time: number) => {
    if (videoRef.current) videoRef.current.currentTime = time;
  };

  const apply = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const edited = Object.keys(texts).length
        ? segments
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

  return (
    <div className="dark fixed inset-0 z-[200] grid place-items-center bg-black/85 p-3" onClick={onClose}>
      <div
        className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#161616] text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3">
          <h3 className="text-[15px] font-bold">Edit clip</h3>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        {/* body: video | transcript */}
        <div className="grid min-h-0 flex-1 md:grid-cols-[1fr_1fr]">
          <div className="flex min-h-0 flex-col items-center justify-center bg-[#101010] p-6">
            {job.source_media_url ? (
              // biome-ignore lint/a11y/useMediaCaption: source preview
              <video
                ref={videoRef}
                src={job.source_media_url}
                controls
                playsInline
                onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
                className="max-h-full w-full rounded-xl bg-black"
              />
            ) : (
              <p className="text-sm text-muted-foreground">Source video unavailable for this job.</p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              Selection: <span className="tabular-nums text-foreground">{fmt(start)}</span> –{" "}
              <span className="tabular-nums text-foreground">{fmt(end)}</span> ·{" "}
              <span className="text-teal-300">{(end - start).toFixed(1)}s</span>
            </p>
          </div>

          {/* transcript */}
          <div ref={listRef} className="min-h-0 overflow-y-auto border-l border-white/[0.07] p-5 [scrollbar-width:thin]">
            {segments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transcript for this job.</p>
            ) : (
              <div className="space-y-1">
                {segments.map((seg, i) => {
                  const inRange = seg.end > start && seg.start < end;
                  const playing = t >= seg.start && t <= seg.end;
                  return (
                    <div
                      key={`${seg.start}-${i}`}
                      data-in-range={inRange}
                      className={cn(
                        "group relative rounded-lg px-3 py-2 transition-colors",
                        inRange ? "bg-teal-400/[0.08]" : "hover:bg-white/[0.04]",
                        i === firstInRange && "border-l-2 border-teal-400",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => seek(seg.start)}
                          className={cn(
                            "shrink-0 pt-0.5 text-[11px] tabular-nums transition-colors",
                            playing ? "text-teal-300" : "text-muted-foreground/60 hover:text-foreground",
                          )}
                        >
                          {fmt(seg.start)}
                        </button>
                        {inRange ? (
                          <textarea
                            value={texts[i] ?? seg.text}
                            onChange={(e) => setTexts((m) => ({ ...m, [i]: e.target.value }))}
                            rows={1}
                            className="min-h-6 flex-1 resize-none bg-transparent text-sm leading-relaxed outline-none [field-sizing:content]"
                          />
                        ) : (
                          <p className="flex-1 text-sm leading-relaxed text-muted-foreground">{seg.text}</p>
                        )}
                      </div>
                      {/* hover trim actions */}
                      <div className="absolute -top-2.5 right-2 hidden gap-1 group-hover:flex">
                        <button
                          type="button"
                          onClick={() => {
                            setStart(Math.min(seg.start, end - 3));
                            seek(seg.start);
                          }}
                          className="flex items-center gap-1 rounded-md border border-white/10 bg-[#242424] px-2 py-0.5 text-[10px] text-foreground/90 shadow-lg hover:bg-[#2e2e2e]"
                        >
                          <ChevronsLeft className="size-3" /> Start here
                        </button>
                        <button
                          type="button"
                          onClick={() => setEnd(Math.max(seg.end, start + 3))}
                          className="flex items-center gap-1 rounded-md border border-white/10 bg-[#242424] px-2 py-0.5 text-[10px] text-foreground/90 shadow-lg hover:bg-[#2e2e2e]"
                        >
                          End here <ChevronsRight className="size-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* footer: range timeline + actions */}
        <div className="border-t border-white/[0.07] px-5 py-4">
          <div className="relative">
            {/* playhead marker */}
            <span
              className="pointer-events-none absolute -top-1 h-6 w-px bg-white/60"
              style={{ left: `${Math.min(100, Math.max(0, (t / sourceDur) * 100))}%` }}
            />
            <Slider
              min={0}
              max={Math.max(1, Math.round(sourceDur * 10) / 10)}
              step={0.1}
              value={[start, end]}
              onValueChange={([a, b]) => {
                if (b - a >= 3) {
                  setStart(a);
                  setEnd(b);
                }
              }}
              className="py-1"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="rounded-xl border border-white/10 px-3 py-2 text-sm tabular-nums">{fmt(start)}</span>
            <span className="text-muted-foreground">–</span>
            <span className="rounded-xl border border-white/10 px-3 py-2 text-sm tabular-nums">{fmt(end)}</span>
            <button
              type="button"
              onClick={() => seek(start)}
              className="rounded-xl px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
            >
              Preview from start
            </button>
            <span className="flex-1 text-right text-xs text-red-400">{error}</span>
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-white/5">
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void apply()}
              className="flex items-center gap-2 rounded-xl bg-teal-400 px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-teal-300 disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Save & re-render
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
