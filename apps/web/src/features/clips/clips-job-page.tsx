"use client";

import {
  ArrowLeft,
  AudioLines,
  Check,
  Clapperboard,
  Download,
  DownloadCloud,
  FileText,
  Film,
  Flame,
  FolderArchive,
  Loader2,
  Pencil,
  RotateCcw,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import {
  authDownload,
  type ClipItem,
  type ClipsJob,
  clipsToProject,
  createClipsJob,
  getClipDownloadUrl,
  getClipsJob,
} from "./api";
import { ClipEditModal } from "./clip-edit-modal";
import { type CcState, ClipPlayer } from "./clip-player";

const PHASES = [
  {
    key: "ingest",
    label: "Fetch the video",
    icon: DownloadCloud,
    hint: "Usually under a minute",
    caption: "Downloading and preparing the source…",
  },
  {
    key: "transcribe",
    label: "Transcribe every word",
    icon: AudioLines,
    hint: "The long one — roughly the video's length",
    caption: "Listening to the audio, word by word…",
  },
  {
    key: "select",
    label: "Pick the best moments",
    icon: Sparkles,
    hint: "About 15 seconds",
    caption: "Reading the transcript for hooks and complete ideas…",
  },
  {
    key: "render",
    label: "Cut, frame & caption",
    icon: Clapperboard,
    hint: "A few seconds per clip",
    caption: "Rendering your clips with captions and face framing…",
  },
] as const;

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

const eta = (startedAt: string | null, progress: number): string | null => {
  if (!startedAt || progress < 0.04) return null;
  const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000;
  const left = elapsed * (1 - progress) / progress;
  if (!Number.isFinite(left) || left < 0) return null;
  if (left < 60) return `~${Math.max(5, Math.round(left / 5) * 5)}s left`;
  return `~${Math.round(left / 60)}m left`;
};

const elapsedLabel = (startedAt: string | null): string | null => {
  if (!startedAt) return null;
  const s = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
};

function triggerDownload(href: string, name: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.target = "_blank";
  a.rel = "noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function ClipsJobPage({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [job, setJob] = useState<ClipsJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0); // bump to restart polling (after a re-render)
  const [busyAction, setBusyAction] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const j = await getClipsJob(jobId);
        if (!alive) return;
        setJob(j);
        const rerendering = j.clips.some((c) => c.status === "rendering");
        if (j.status === "queued" || j.status === "running" || rerendering) timer = setTimeout(poll, 2000);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Job not found");
      }
    };
    void poll();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [jobId, nonce]);

  const retry = async () => {
    if (!job) return;
    const fresh = await createClipsJob({
      source_url: job.source_url ?? undefined,
      // biome-ignore lint/suspicious/noExplicitAny: params round-trip as-is
      params: job.params as any,
    });
    router.push(`/clips/${fresh.id}`);
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <button
        type="button"
        onClick={() => router.push("/clips")}
        className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Clips
      </button>

      {error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : !job ? (
        <div className="grid h-64 place-items-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <div className="flex min-w-0 items-center gap-4">
              {job.source_thumb_url && job.status !== "running" && job.status !== "queued" ? (
                // biome-ignore lint/a11y/useAltText: source poster
                <img src={job.source_thumb_url} className="h-16 w-28 shrink-0 rounded-lg border border-border object-cover" />
              ) : null}
              <div className="min-w-0">
                <h1 className="mb-1 truncate text-xl font-bold">
                  {job.source_title ?? job.source_url ?? "Uploaded video"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {job.duration ? `${fmt(job.duration)} source · ` : ""}
                  {job.status === "completed" ? `${job.clips.length} clips` : job.status}
                  {" · "}
                  {String((job.params as { ratio?: string }).ratio ?? "9:16")}
                  {(job.params as { captions?: boolean }).captions !== false ? " · captions" : ""}
                </p>
              </div>
            </div>
            {job.status === "completed" && job.clips.length > 0 ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busyAction !== null}
                  onClick={() => {
                    setBusyAction("editor");
                    clipsToProject(job.id)
                      .then(({ workflow_id }) => router.push(`/video-editor?project=${workflow_id}`))
                      .catch(() => setBusyAction(null));
                  }}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-accent disabled:opacity-60"
                >
                  {busyAction === "editor" ? <Loader2 className="size-4 animate-spin" /> : <Clapperboard className="size-4" />}
                  Open in editor
                </button>
                <button
                  type="button"
                  disabled={busyAction !== null}
                  onClick={() => {
                    setBusyAction("zip");
                    void authDownload(`/clips/jobs/${job.id}/zip`, "clips.zip").finally(() => setBusyAction(null));
                  }}
                  className="flex items-center gap-2 rounded-lg bg-teal-500 px-3 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {busyAction === "zip" ? <Loader2 className="size-4 animate-spin" /> : <FolderArchive className="size-4" />}
                  Download all
                </button>
              </div>
            ) : null}
          </div>

          {job.status === "failed" ? (
            <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-6">
              <p className="flex items-center gap-2 font-medium text-red-400">
                <XCircle className="size-5" /> This job failed
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{job.error}</p>
              {job.source_url ? (
                <button
                  type="button"
                  onClick={() => void retry()}
                  className="mt-4 flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm hover:bg-secondary/80"
                >
                  <RotateCcw className="size-4" /> Try again
                </button>
              ) : null}
            </div>
          ) : job.status !== "completed" ? (
            <PhaseTracker job={job} />
          ) : (
            <ClipGallery
              job={job}
              onJobUpdate={(j) => {
                setJob(j);
                setNonce((n) => n + 1);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

function PhaseTracker({ job }: { job: ClipsJob }) {
  const current = PHASES.findIndex((p) => p.key === job.phase);
  // 1s tick keeps the elapsed/ETA labels breathing between 2s polls.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_1fr]">
        {/* preview panel */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {job.source_thumb_url ? (
            <div className="relative">
              {/* biome-ignore lint/a11y/useAltText: source poster */}
              <img src={job.source_thumb_url} className="aspect-video w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              {job.duration ? (
                <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] tabular-nums text-white">
                  {fmt(job.duration)}
                </span>
              ) : null}
            </div>
          ) : (
            <div className="relative grid aspect-video w-full place-items-center overflow-hidden bg-[#101010]">
              <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/[0.04] to-transparent" />
              <div className="flex flex-col items-center gap-2 text-muted-foreground/60">
                <Film className="size-8" strokeWidth={1.25} />
                <span className="text-xs">Preparing preview…</span>
              </div>
            </div>
          )}
          <div className="space-y-2.5 p-4">
            <p className="truncate text-sm font-medium" title={job.source_title ?? job.source_url ?? ""}>
              {job.source_title ?? job.source_url ?? "Uploaded video"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[
                String((job.params as { ratio?: string }).ratio ?? "9:16"),
                (job.params as { captions?: boolean }).captions !== false
                  ? `Captions · ${String((job.params as { caption_style?: string }).caption_style ?? "clean")}`
                  : "No captions",
                (job.params as { framing?: boolean }).framing !== false ? "Face framing" : null,
                (job.params as { focus?: string }).focus?.trim() ? "Focused" : null,
              ]
                .filter(Boolean)
                .map((chip) => (
                  <span key={String(chip)} className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-muted-foreground">
                    {chip}
                  </span>
                ))}
            </div>
            <p className="text-[11px] text-muted-foreground/60">
              You can leave this page — the job keeps running and shows up under Recent.
            </p>
          </div>
        </div>

        {/* vertical step list */}
        <div className="rounded-2xl border border-border bg-card p-5">
          {PHASES.map((phase, i) => {
            const state = i < current ? "done" : i === current ? "active" : "pending";
            const isLast = i === PHASES.length - 1;
            const showBar = state === "active" && job.progress > 0;
            const left = state === "active" ? eta(job.phase_started_at, job.progress) : null;
            const elapsed = state === "active" ? elapsedLabel(job.phase_started_at) : null;
            const Icon = phase.icon;
            return (
              <div key={phase.key} className="flex gap-4">
                {/* rail */}
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-full border transition-colors",
                      state === "done"
                        ? "border-teal-400/40 bg-teal-400/15 text-teal-300"
                        : state === "active"
                          ? "border-teal-400 text-teal-300 shadow-[0_0_16px_-4px_rgba(45,212,191,0.6)]"
                          : "border-border text-muted-foreground/50",
                    )}
                  >
                    {state === "done" ? <Check className="size-4" /> : <Icon className={cn("size-4", state === "active" && "animate-pulse")} />}
                  </span>
                  {!isLast ? (
                    <span className={cn("w-px flex-1", state === "done" ? "bg-teal-400/40" : "bg-border")} />
                  ) : null}
                </div>

                {/* content */}
                <div className={cn("min-w-0 flex-1", !isLast && "pb-6")}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        state === "pending" ? "text-muted-foreground/60" : "text-foreground",
                      )}
                    >
                      {phase.label}
                    </p>
                    <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                      {state === "done" ? "Done" : state === "active" ? (elapsed ?? "") : ""}
                    </span>
                  </div>

                  {state === "active" ? (
                    <>
                      <p className="mt-0.5 text-xs text-muted-foreground">{phase.caption}</p>
                      {showBar ? (
                        <div className="mt-2.5">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-teal-400 transition-[width] duration-700"
                              style={{ width: `${Math.round(job.progress * 100)}%` }}
                            />
                          </div>
                          <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                            <span>{Math.round(job.progress * 100)}%</span>
                            {left ? <span>{left}</span> : null}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                          <div className="h-full w-1/3 animate-[clip-indeterminate_1.4s_ease-in-out_infinite] rounded-full bg-teal-400/70" />
                        </div>
                      )}
                    </>
                  ) : state === "pending" ? (
                    <p className="mt-0.5 text-xs text-muted-foreground/50">{phase.hint}</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {job.phase === "transcribe" && job.transcript && job.transcript.length > 0 ? (
        <TranscriptFeed segments={job.transcript} />
      ) : null}

      {job.phase === "render" ? <RenderingGallery job={job} /> : null}
    </div>
  );
}

// Live transcript peek: the latest lines fade in as whisper works.
function TranscriptFeed({ segments }: { segments: NonNullable<ClipsJob["transcript"]> }) {
  const latest = segments.slice(-4);
  const words = segments.reduce((n, s) => n + s.text.split(/\s+/).length, 0);
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-medium text-foreground/80">Live transcript</span>
        <span>
          {segments.length} segments · ~{words} words
        </span>
      </div>
      <div className="space-y-1.5">
        {latest.map((seg) => (
          <p key={`${seg.start}`} className="animate-in fade-in-0 text-sm text-muted-foreground duration-500">
            <span className="mr-2 text-[11px] tabular-nums text-muted-foreground/50">{fmt(seg.start)}</span>
            {seg.text}
          </p>
        ))}
      </div>
    </div>
  );
}

// During render, finished clips are playable immediately; the rest shimmer.
function RenderingGallery({ job }: { job: ClipsJob }) {
  const done = job.clips.length;
  const total = job.progress > 0 ? Math.max(done, Math.round(done / job.progress)) : Math.max(done + 1, 3);
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {job.clips.map((clip) => (
        <div key={clip.id} className="overflow-hidden rounded-xl border border-border bg-card">
          {clip.url ? (
            // biome-ignore lint/a11y/useMediaCaption: clip preview
            <video src={clip.url} controls preload="metadata" className="aspect-[9/16] w-full bg-black object-contain" />
          ) : null}
          <div className="p-3">
            <p className="truncate text-sm font-medium">{clip.title}</p>
            <p className="text-xs text-muted-foreground">{Math.round(clip.end - clip.start)}s · ready</p>
          </div>
        </div>
      ))}
      {Array.from({ length: Math.max(0, total - done) }, (_, i) => (
        <div key={`pending-${i}`} className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="grid aspect-[9/16] w-full animate-pulse place-items-center bg-white/5">
            <Loader2 className="size-5 animate-spin text-muted-foreground/50" />
          </div>
          <div className="space-y-2 p-3">
            <div className="h-3 w-3/4 animate-pulse rounded bg-white/10" />
            <div className="h-2.5 w-1/3 animate-pulse rounded bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ClipGallery({ job, onJobUpdate }: { job: ClipsJob; onJobUpdate: (j: ClipsJob) => void }) {
  const [editing, setEditing] = useState<ClipItem | null>(null);
  // Per-clip caption state (overlay + what Download burns). Defaults from job settings.
  const jobCc: CcState = {
    on: (job.params as { captions?: boolean }).captions !== false,
    style: ((job.params as { caption_style?: string }).caption_style as CcState["style"]) ?? "clean",
  };
  const [ccMap, setCcMap] = useState<Record<string, CcState>>({});
  const [downloading, setDownloading] = useState<string | null>(null);
  const title = job.source_title ?? "clip";

  const download = async (clip: ClipItem, index: number) => {
    setDownloading(clip.id);
    try {
      const cc = ccMap[clip.id] ?? jobCc;
      const { url } = await getClipDownloadUrl(job.id, clip.id, cc.on ? cc.style : "none");
      triggerDownload(url, `${title}-clip-${index + 1}.mp4`);
    } finally {
      setDownloading(null);
    }
  };

  if (job.clips.length === 0) {
    return <p className="text-sm text-muted-foreground">No clips were produced from this source.</p>;
  }
  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {job.clips.map((clip, i) => (
          <div key={clip.id} className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="relative bg-black">
              <ClipPlayer
                clip={clip}
                transcript={job.transcript ?? []}
                cc={ccMap[clip.id] ?? jobCc}
                onCcChange={(cc) => setCcMap((m) => ({ ...m, [clip.id]: cc }))}
              />
              <span
                className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white"
                title={clip.reason}
              >
                <Flame className="size-3 text-orange-400" />
                {clip.score}
              </span>
              {clip.status === "rendering" ? (
                <div className="absolute inset-0 grid place-items-center bg-black/70 text-xs text-white">
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" /> Re-rendering…
                  </span>
                </div>
              ) : null}
              {clip.status === "failed" ? (
                <div className="absolute inset-x-0 bottom-0 bg-red-500/80 px-2 py-1 text-[11px] text-white" title={clip.error}>
                  Re-render failed
                </div>
              ) : null}
            </div>
            <div className="p-3">
              <p className="truncate text-sm font-medium" title={clip.title}>
                {clip.title}
              </p>
              {clip.reason ? (
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground" title={clip.reason}>
                  {clip.reason}
                </p>
              ) : null}
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {fmt(clip.start)}–{fmt(clip.end)} · {Math.round(clip.end - clip.start)}s
                </span>
                <div className="flex">
                  <button
                    type="button"
                    aria-label="Edit clip"
                    title="Trim & captions"
                    disabled={clip.status === "rendering"}
                    onClick={() => setEditing(clip)}
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Download captions (SRT)"
                    title="Captions (.srt)"
                    onClick={() =>
                      void authDownload(`/clips/jobs/${job.id}/clips/${clip.id}/srt`, `${title}-clip-${i + 1}.srt`)
                    }
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <FileText className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Download clip"
                    title="Download MP4 (with current caption setting)"
                    disabled={downloading === clip.id}
                    onClick={() => void download(clip, i)}
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                  >
                    {downloading === clip.id ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {editing ? (
        <ClipEditModal job={job} clip={editing} onClose={() => setEditing(null)} onSaved={onJobUpdate} />
      ) : null}
    </>
  );
}
