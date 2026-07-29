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
  { key: "ingest", label: "Fetch" },
  { key: "transcribe", label: "Transcribe" },
  { key: "select", label: "Pick moments" },
  { key: "render", label: "Render" },
] as const;

const PHASE_CAPTION: Record<string, string> = {
  ingest: "Fetching and preparing the source video…",
  transcribe: "Listening to the audio and writing the transcript…",
  select: "Reading the transcript to find the strongest moments…",
  render: "Cutting and framing your clips…",
};

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

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
            <div className="min-w-0">
              <h1 className="mb-1 truncate text-xl font-bold">
                {job.source_title ?? job.source_url ?? "Uploaded video"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {job.duration ? `${fmt(job.duration)} source · ` : ""}
                {job.status === "completed" ? `${job.clips.length} clips` : job.status}
              </p>
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
  return (
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
            </div>
          </div>
        ))}
      </div>
      <p className="text-center text-sm text-muted-foreground">
        {PHASE_CAPTION[job.phase]}
        {job.phase === "render" && job.progress > 0 ? ` (${Math.round(job.progress * 100)}%)` : ""}
      </p>
      <p className="mt-1 text-center text-xs text-muted-foreground/60">
        You can leave this page — the job keeps running and shows up under Recent.
      </p>
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
