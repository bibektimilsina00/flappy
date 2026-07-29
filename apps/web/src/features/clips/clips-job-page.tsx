"use client";

import {
  ArrowLeft,
  Check,
  Clapperboard,
  Download,
  FileText,
  Flame,
  FolderArchive,
  Loader2,
  Pencil,
  RotateCcw,
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
  getClipsJob,
} from "./api";
import { ClipEditModal } from "./clip-edit-modal";

const PHASES = [
  { key: "ingest", label: "Fetch", hint: "usually under a minute" },
  { key: "transcribe", label: "Transcribe", hint: "the long one — roughly the video's length" },
  { key: "select", label: "Pick moments", hint: "about 15 seconds" },
  { key: "render", label: "Render", hint: "a few seconds per clip" },
] as const;

const PHASE_CAPTION: Record<string, string> = {
  ingest: "Fetching and preparing the source video…",
  transcribe: "Listening to the audio and writing the transcript…",
  select: "Reading the transcript to find the strongest moments…",
  render: "Cutting, framing, and captioning your clips…",
};

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

const eta = (startedAt: string | null, progress: number): string | null => {
  if (!startedAt || progress < 0.04) return null;
  const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000;
  const left = elapsed * (1 - progress) / progress;
  if (!Number.isFinite(left) || left < 0) return null;
  if (left < 60) return `~${Math.max(5, Math.round(left / 5) * 5)}s left`;
  return `~${Math.round(left / 60)}m left`;
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
              {job.source_thumb_url ? (
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
  const hasBar = (job.phase === "transcribe" || job.phase === "render") && job.progress > 0;
  // 1s tick keeps the ETA breathing between 2s polls.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const left = eta(job.phase_started_at, job.progress);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-8">
        <div className="mb-6 flex items-center">
          {PHASES.map((phase, i) => (
            <div key={phase.key} className={cn("flex items-center", i > 0 && "flex-1")}>
              {i > 0 ? (
                <div className={cn("mx-2 h-px flex-1", i <= current ? "bg-teal-400" : "bg-border")} />
              ) : null}
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className={cn(
                    "grid size-8 place-items-center rounded-full text-xs font-semibold",
                    i < current
                      ? "bg-teal-400 text-black"
                      : i === current
                        ? "border-2 border-teal-400 text-teal-400"
                        : "border border-border text-muted-foreground",
                  )}
                >
                  {i < current ? <Check className="size-4" /> : i === current ? <Loader2 className="size-4 animate-spin" /> : i + 1}
                </span>
                <span className={cn("text-xs", i <= current ? "text-foreground" : "text-muted-foreground")}>
                  {phase.label}
                </span>
                <span className={cn("text-[10px]", i === current ? "text-muted-foreground" : "text-transparent")}>
                  {i === current ? ((hasBar && left) || phase.hint) : "·"}
                </span>
              </div>
            </div>
          ))}
        </div>

        {hasBar ? (
          <div className="mx-auto mb-4 max-w-xl">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-teal-400 transition-[width] duration-700"
                style={{ width: `${Math.round(job.progress * 100)}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
              <span>{Math.round(job.progress * 100)}%</span>
              {left ? <span>{left}</span> : null}
            </div>
          </div>
        ) : null}

        <p className="text-center text-sm text-muted-foreground">{PHASE_CAPTION[job.phase]}</p>
        <p className="mt-1 text-center text-xs text-muted-foreground/60">
          You can leave this page — the job keeps running and shows up under Recent.
        </p>
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
  const title = job.source_title ?? "clip";
  if (job.clips.length === 0) {
    return <p className="text-sm text-muted-foreground">No clips were produced from this source.</p>;
  }
  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {job.clips.map((clip, i) => (
          <div key={clip.id} className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="relative bg-black">
              {clip.url ? (
                // biome-ignore lint/a11y/useMediaCaption: generated clip preview
                <video
                  key={clip.key}
                  src={clip.url}
                  controls
                  preload="metadata"
                  className="aspect-[9/16] w-full object-contain"
                />
              ) : null}
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
                    title="Download MP4"
                    onClick={() => clip.url && triggerDownload(clip.url, `${title}-clip-${i + 1}.mp4`)}
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <Download className="size-4" />
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
