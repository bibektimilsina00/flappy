"use client";

import {
  ArrowLeft,
  AudioLines,
  CalendarClock,
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
  cancelScheduledPost,
  type ClipItem,
  type ClipsJob,
  clipsToProject,
  createClipsJob,
  getClipDownloadUrl,
  getClipsJob,
  listSchedule,
  type ScheduledPost,
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
            <>
              <ClipGallery
                job={job}
                onJobUpdate={(j) => {
                  setJob(j);
                  setNonce((n) => n + 1);
                }}
              />
              {(job.params as { schedule?: { enabled?: boolean } }).schedule?.enabled ? (
                <PostingQueue jobId={job.id} />
              ) : null}
            </>
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

// The job's auto-scheduled posting calendar. "Due" posts are ready to publish.
function PostingQueue({ jobId }: { jobId: string }) {
  const [posts, setPosts] = useState<ScheduledPost[] | null>(null);

  useEffect(() => {
    listSchedule()
      .then((all) => setPosts(all.filter((p) => p.job_id === jobId)))
      .catch(() => setPosts([]));
  }, [jobId]);

  if (!posts || posts.length === 0) return null;
  return (
    <div className="mt-8">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <CalendarClock className="size-4 text-teal-300" /> Posting queue
        <span className="font-normal text-muted-foreground">{posts.length} scheduled</span>
      </h2>
      <div className="space-y-2">
        {posts.map((post) => {
          const when = new Date(post.post_at);
          return (
            <div key={post.id} className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  post.status === "due" ? "bg-teal-400/15 text-teal-300" : "bg-white/5 text-muted-foreground",
                )}
              >
                {post.status === "due" ? "Ready to post" : "Scheduled"}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">{post.title ?? "Clip"}</span>
              {post.score != null ? (
                <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                  <Flame className="size-3 text-orange-400" />
                  {post.score}
                </span>
              ) : null}
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {when.toLocaleDateString(undefined, { month: "short", day: "numeric" })}{" "}
                {when.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
              </span>
              {post.status === "due" && post.url ? (
                <button
                  type="button"
                  aria-label="Download for posting"
                  title="Download MP4"
                  onClick={() => post.url && triggerDownload(post.url, `${post.title ?? "clip"}.mp4`)}
                  className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Download className="size-4" />
                </button>
              ) : null}
              <button
                type="button"
                aria-label="Cancel scheduled post"
                title="Remove from queue"
                onClick={() => {
                  void cancelScheduledPost(post.id).then(() =>
                    setPosts((list) => (list ?? []).filter((p) => p.id !== post.id)),
                  );
                }}
                className="hidden shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-red-400 group-hover:block"
              >
                <XCircle className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground/60">
        Posts flip to “Ready to post” at their scheduled time. Direct auto-posting arrives with connected accounts.
      </p>
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
  const [sort, setSort] = useState<"score" | "time">("score");
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

  const clips = [...job.clips].sort((a, b) => (sort === "score" ? b.score - a.score : a.start - b.start));

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{clips.length} clips</p>
        <div className="flex gap-1 rounded-lg border border-white/10 p-0.5 text-xs">
          {(["score", "time"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSort(s)}
              className={cn(
                "rounded-md px-2.5 py-1 transition-colors",
                sort === s ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s === "score" ? "Highest score" : "Timeline order"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-6">
        {/* clip rail */}
        <aside className="sticky top-6 hidden w-52 shrink-0 self-start xl:block">
          <div className="space-y-1.5">
            {clips.map((clip, i) => (
              <button
                key={clip.id}
                type="button"
                onClick={() => document.getElementById(`clip-${clip.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="flex w-full items-center gap-2.5 rounded-xl p-1.5 text-left transition-colors hover:bg-white/5"
              >
                <span className="relative h-14 w-9 shrink-0 overflow-hidden rounded-md bg-black">
                  {clip.url ? (
                    // biome-ignore lint/a11y/useMediaCaption: rail thumbnail
                    <video src={clip.url} preload="metadata" muted className="size-full object-cover" />
                  ) : null}
                  <span className="absolute bottom-0 left-0 rounded-tr-md bg-black/80 px-1 text-[9px] font-bold text-white">
                    {i + 1}
                  </span>
                </span>
                <span className="line-clamp-2 text-xs leading-snug text-foreground/80">{clip.title}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* result rows */}
        <div className="min-w-0 flex-1 space-y-5">
          {clips.map((clip, i) => (
            <ClipRow
              key={clip.id}
              job={job}
              clip={clip}
              rank={i + 1}
              cc={ccMap[clip.id] ?? jobCc}
              onCcChange={(cc) => setCcMap((m) => ({ ...m, [clip.id]: cc }))}
              downloading={downloading === clip.id}
              onDownload={() => void download(clip, i)}
              onSrt={() => void authDownload(`/clips/jobs/${job.id}/clips/${clip.id}/srt`, `${title}-clip-${i + 1}.srt`)}
              onEdit={() => setEditing(clip)}
            />
          ))}
        </div>
      </div>

      {editing ? (
        <ClipEditModal job={job} clip={editing} onClose={() => setEditing(null)} onSaved={onJobUpdate} />
      ) : null}
    </>
  );
}

function ClipRow({
  job,
  clip,
  rank,
  cc,
  onCcChange,
  downloading,
  onDownload,
  onSrt,
  onEdit,
}: {
  job: ClipsJob;
  clip: ClipItem;
  rank: number;
  cc: CcState;
  onCcChange: (cc: CcState) => void;
  downloading: boolean;
  onDownload: () => void;
  onSrt: () => void;
  onEdit: () => void;
}) {
  const segments = (job.transcript ?? []).filter((s) => s.end > clip.start && s.start < clip.end);
  return (
    <div id={`clip-${clip.id}`} className="scroll-mt-6 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-col gap-5 sm:flex-row">
        {/* player */}
        <div className="relative w-full shrink-0 overflow-hidden rounded-xl sm:w-[240px]">
          <ClipPlayer clip={clip} transcript={job.transcript ?? []} cc={cc} onCcChange={onCcChange} />
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

        {/* details */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-semibold leading-snug">
              <span className="mr-2 text-muted-foreground">#{rank}</span>
              {clip.title}
            </h3>
            <div className="flex shrink-0">
              <button
                type="button"
                aria-label="Edit clip"
                title="Trim & captions"
                disabled={clip.status === "rendering"}
                onClick={onEdit}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
              >
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Download captions (SRT)"
                title="Captions (.srt)"
                onClick={onSrt}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <FileText className="size-4" />
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4">
            <div>
              <p className="text-3xl font-extrabold leading-none text-teal-300">{clip.score}</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Virality
              </p>
            </div>
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs tabular-nums text-muted-foreground">
              {fmt(clip.start)}–{fmt(clip.end)} · {Math.round(clip.end - clip.start)}s
            </span>
            <span className="flex-1" />
            <button
              type="button"
              disabled={downloading}
              onClick={onDownload}
              className="flex items-center gap-2 rounded-xl bg-teal-400 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-teal-300 disabled:opacity-60"
            >
              {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              Download
            </button>
          </div>

          {clip.reason ? (
            <div className="mt-3 rounded-xl bg-white/5 px-3.5 py-2.5">
              <p className="text-[11px] font-medium text-muted-foreground">Viral reason</p>
              <p className="mt-0.5 text-sm text-foreground/90">{clip.reason}</p>
            </div>
          ) : null}

          {segments.length > 0 ? (
            <div className="mt-3 max-h-48 space-y-1.5 overflow-y-auto pr-2 [scrollbar-width:thin]">
              {segments.map((seg) => (
                <p key={`${seg.start}`} className="text-sm leading-relaxed text-muted-foreground">
                  <span className="mr-2 select-none text-[11px] tabular-nums text-muted-foreground/50">
                    {fmt(Math.max(seg.start, clip.start))}
                  </span>
                  {seg.text}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
