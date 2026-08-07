"use client";

import {
  AlertTriangle,
  ArrowLeft,
  AudioLines,
  CalendarClock,
  Check,
  Clapperboard,
  Clock,
  Component,
  Download,
  DownloadCloud,
  FileText,
  Film,
  Flame,
  FolderArchive,
  Gem,
  Loader2,
  type LucideIcon,
  RotateCcw,
  Scissors,
  SendHorizontal,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { openUpgrade } from "@/features/billing";
import { cn } from "@/lib/cn";
import {
  authDownload,
  bulkSchedule,
  cancelScheduledPost,
  clipsToProject,
  createClipsJob,
  getClipDownloadUrl,
  getClipsJob,
  listSchedule,
} from "../services/clips-api";
import type { ClipItem, ClipsJob, CustomCaptionStyle, ScheduledPost } from "../types";
import { Checkbox } from "@/components/ui/checkbox";
import { ClipEditModal } from "../components/clip-edit-modal";
import { PublishPanel } from "../components/publish-panel";
import { defaultSchedule, ScheduleModal } from "../components/schedule-modal";
import { type CcState, ClipPlayer } from "../components/clip-player";
import { EditorModeTabs } from "@/shared/components/editor-mode-tabs";

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
    caption: "Rendering your clips with captions…",
  },
] as const;

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
  const [queueNonce, setQueueNonce] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [publishClip, setPublishClip] = useState<ClipItem | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const j = await getClipsJob(jobId);
        if (!alive) return;
        // Presigned URLs get a fresh signature every poll — keep the first one
        // per unchanged clip so <video src> stays stable and doesn't reload.
        setJob((prev) => {
          if (prev) {
            const old = new Map(prev.clips.map((c) => [c.id, c]));
            for (const c of j.clips) {
              const p = old.get(c.id);
              if (p?.url && c.url && p.key === c.key && p.status === c.status) c.url = p.url;
            }
          }
          return j;
        });
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
    <div className="flex h-full w-full flex-col p-2">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-7xl px-6 py-4">
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
          {/* Retention notice banner for Free plan */}
          {job.is_free_plan ? (
            job.is_expired || job.retention_status === "expired" || job.retention_status === "hard_deleted" ? (
              <RetentionBanner
                tone="danger"
                icon={AlertTriangle}
                title="Clip expired"
                body="This clip passed the 3-day Free plan retention limit and was removed. Upgrade to keep every future clip permanently."
                cta="Upgrade to Pro"
                reason="Keep your clips forever"
              />
            ) : (
              <RetentionBanner
                tone="warning"
                icon={Clock}
                title="Free plan storage"
                body={
                  <>
                    Clips are kept for 3 days (
                    <strong className="text-foreground">{job.days_remaining === 1 ? "1 day left" : `${job.days_remaining ?? 0} days left`}</strong>
                    ). Media files are permanently purged after 5 days.
                  </>
                }
                cta="Upgrade for permanent storage"
                reason="Keep your clips forever"
              />
            )
          ) : null}

          <div className="mb-8 flex items-center justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              {job.source_thumb_url && job.status !== "running" && job.status !== "queued" ? (
                // biome-ignore lint/a11y/useAltText: source poster
                <img src={job.source_thumb_url} className="h-16 w-28 shrink-0 rounded-lg border border-border object-cover" />
              ) : null}
              <div className="min-w-0">
                <h1 className="mb-1 line-clamp-2 text-xl font-bold">
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
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  disabled={selected.size === 0}
                  title={selected.size === 0 ? "Select clips below first" : undefined}
                  onClick={() => {
                    if (selected.size === 1) {
                      const clip = job.clips.find((c) => selected.has(c.id));
                      if (clip) setPublishClip(clip);
                    } else if (selected.size > 1) {
                      setBulkOpen(true);
                    }
                  }}
                  className="flex items-center gap-2 rounded-lg border border-teal-400/40 px-3 py-2 text-sm font-semibold text-teal-300 transition-colors hover:bg-teal-400/10 disabled:cursor-not-allowed disabled:border-border disabled:text-muted-foreground/50"
                >
                  {selected.size > 1 ? <CalendarClock className="size-4" /> : <SendHorizontal className="size-4" />}
                  {selected.size > 1 ? "Bulk schedule" : "Publish"}
                </button>
                <button
                  type="button"
                  disabled={busyAction !== null}
                  onClick={() => {
                    setBusyAction("editor");
                    clipsToProject(job.id, selected.size > 0 ? [...selected] : undefined)
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
                    const qs = selected.size > 0 ? `?ids=${[...selected].join(",")}` : "";
                    void authDownload(`/clips/jobs/${job.id}/zip${qs}`, "clips.zip").finally(() =>
                      setBusyAction(null),
                    );
                  }}
                  className="flex items-center gap-2 rounded-lg bg-teal-500 px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {busyAction === "zip" ? <Loader2 className="size-4 animate-spin" /> : <FolderArchive className="size-4" />}
                  {selected.size > 0 ? "Download" : "Download all"}
                </button>
              </div>
            ) : null}
          </div>

          {job.status === "failed" ? (
            <JobFailed job={job} onRetry={() => void retry()} />
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
                selected={selected}
                setSelected={setSelected}
                onPublish={setPublishClip}
              />
              <PostingQueue jobId={job.id} refresh={queueNonce} />
              {publishClip ? (
                <PublishPanel
                  jobId={job.id}
                  clipId={publishClip.id}
                  clipTitle={publishClip.title}
                  onClose={() => {
                    setPublishClip(null);
                    setQueueNonce((n) => n + 1);
                  }}
                />
              ) : null}
              {bulkOpen ? (
                <ScheduleModal
                  value={defaultSchedule()}
                  onSave={(cfg) => {
                    void bulkSchedule(job.id, [...selected], cfg).then(() => {
                      setSelected(new Set());
                      setQueueNonce((n) => n + 1);
                    });
                  }}
                  onClose={() => setBulkOpen(false)}
                />
              ) : null}
            </>
          )}
        </>
      )}
        </div>
      </div>
      {job && job.status === "completed" && job.clips.length > 0 ? (
        <ClipsModeTabs job={job} onLinked={(wf) => setJob({ ...job, workflow_id: wf })} />
      ) : (
        <EditorModeTabs projectId={job?.workflow_id ?? null} mode="clips" className="shrink-0 overflow-hidden rounded-lg border border-border" />
      )}
    </div>
  );
}

// Canvas | Editor | Clips switcher — always visible on a finished job. If the
// job isn't linked to a project yet, the first switch creates it.
function ClipsModeTabs({ job, onLinked }: { job: ClipsJob; onLinked: (workflowId: string) => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const go = (mode: "canvas" | "video") => {
    const dest = (wf: string) => (mode === "canvas" ? `/canvas?project=${wf}` : `/video-editor?project=${wf}`);
    if (job.workflow_id) {
      router.push(dest(job.workflow_id));
      return;
    }
    setBusy(mode);
    clipsToProject(job.id)
      .then(({ workflow_id }) => {
        onLinked(workflow_id);
        router.push(dest(workflow_id));
      })
      .catch(() => setBusy(null));
  };

  const tabs = [
    { id: "canvas", label: "Canvas", Icon: Component, onClick: () => go("canvas") },
    { id: "video", label: "Editor", Icon: Clapperboard, onClick: () => go("video") },
    { id: "clips", label: "Clips", Icon: Scissors, onClick: () => {} },
  ] as const;

  return (
    <div className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-secondary/50 p-1 text-xs font-medium">
      {tabs.map(({ id, label, Icon, onClick }) => {
        const active = id === "clips";
          return (
            <button
              key={id}
              type="button"
              onClick={onClick}
              disabled={busy !== null}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1 transition-all duration-150",
                active
                  ? "bg-background text-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              {busy === id ? (
                <Loader2 className="size-3.5 shrink-0 animate-spin text-teal-400" />
              ) : (
                <Icon className="size-3.5 shrink-0" style={active ? { color: "#14b8a6" } : undefined} />
              )}
              {label}
            </button>
          );
        })}
    </div>
  );
}

const PHRASE: Record<string, string> = {
  ingest: "Fetching video",
  transcribe: "Transcribing",
  select: "Finding moments",
  render: "Making cuts",
};

// Slim retention/upgrade banner. Amber for the countdown, red once expired.
function RetentionBanner({
  tone,
  icon: Icon,
  title,
  body,
  cta,
  reason,
}: {
  tone: "warning" | "danger";
  icon: LucideIcon;
  title: string;
  body: ReactNode;
  cta: string;
  reason: string;
}) {
  const danger = tone === "danger";
  return (
    <div
      className={cn(
        "mb-6 flex flex-wrap items-center gap-4 rounded-xl border p-3 pr-3 shadow-lg",
        danger
          ? "border-red-400/30 bg-gradient-to-r from-red-500/12 to-transparent"
          : "border-amber-400/25 bg-gradient-to-r from-amber-500/12 to-transparent",
      )}
    >
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-lg",
          danger ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400",
        )}
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-bold", danger ? "text-red-300" : "text-amber-300")}>{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{body}</p>
      </div>
      <button
        type="button"
        onClick={() => openUpgrade(reason)}
        className="group relative flex shrink-0 items-center gap-1.5 overflow-hidden rounded-lg bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200 px-4 py-2 text-xs font-bold text-black shadow-md shadow-amber-500/25 transition-shadow hover:shadow-lg hover:shadow-amber-500/40"
      >
        <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
        <Gem className="size-3.5" /> {cta}
      </button>
    </div>
  );
}

// A failed job. Credit/payment failures get a premium upgrade card; everything
// else gets a clean error card with a retry.
function JobFailed({ job, onRetry }: { job: ClipsJob; onRetry: () => void }) {
  const router = useRouter();
  const err = job.error ?? "Something went wrong while creating your clips.";
  const isCredits = /insufficient credits|not enough credits|need\s+[\d.]+/i.test(err);
  const need = err.match(/need\s+([\d.]+)/i)?.[1];
  const canRetry = Boolean(job.source_url); // uploads can't be re-fetched

  if (isCredits) {
    return (
      <div className="relative mx-auto max-w-xl overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-b from-amber-500/[0.08] to-transparent p-8 text-center shadow-xl">
        <div className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-amber-400/15 blur-3xl" />
        <span className="relative mx-auto grid size-14 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-yellow-500 text-black shadow-lg shadow-amber-500/30">
          <Gem className="size-7" />
        </span>
        <h2 className="relative mt-5 text-xl font-extrabold">You&apos;re out of credits</h2>
        <p className="relative mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          This clip needs {need ? <strong className="text-foreground">{Math.ceil(Number(need))} credits</strong> : "more credits"} to
          render. Upgrade your plan to top up and pick up right where you left off.
        </p>
        <div className="relative mt-6 flex flex-col justify-center gap-2.5 sm:flex-row">
          <button
            type="button"
            onClick={() => openUpgrade("You're out of credits")}
            className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-lg bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200 px-6 py-2.5 text-sm font-bold text-black shadow-lg shadow-amber-500/25 transition-shadow hover:shadow-xl hover:shadow-amber-500/40"
          >
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <Gem className="size-4" /> Upgrade &amp; get credits
          </button>
          {canRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="flex items-center justify-center gap-2 rounded-lg border border-border px-6 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <RotateCcw className="size-4" /> Retry now
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-red-400/25 bg-red-400/[0.04] p-8 text-center shadow-xl">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-red-500/15 text-red-400">
        <AlertTriangle className="size-7" />
      </span>
      <h2 className="mt-5 text-xl font-extrabold">This job didn&apos;t finish</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{err}</p>
      <div className="mt-6 flex flex-col justify-center gap-2.5 sm:flex-row">
        {canRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center justify-center gap-2 rounded-lg bg-teal-500 px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <RotateCcw className="size-4" /> Try again
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => router.push("/clips")}
          className="flex items-center justify-center gap-2 rounded-lg border border-border px-6 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to Clips
        </button>
      </div>
      {!canRetry ? (
        <p className="mt-4 text-xs text-muted-foreground/60">
          Uploaded files can&apos;t be re-fetched — start a new job from the Clips page.
        </p>
      ) : null}
    </div>
  );
}

function PhaseTracker({ job }: { job: ClipsJob }) {
  const raw = PHASES.findIndex((p) => p.key === job.phase);
  const current = raw < 0 ? 0 : raw;
  const activePct = Math.round((job.progress || 0) * 100);

  return (
    <div className="space-y-6">
      <div className="grid min-h-[440px] place-items-center py-8">
        {/* swiping stage carousel — previous / active / next slide as phases pass */}
        <div className="relative flex items-center justify-center gap-6 overflow-hidden px-4">
          {PHASES.map((phase, i) => {
            const offset = i - current; // -1 prev, 0 active, 1 next
            if (Math.abs(offset) > 1) return null;
            const isActive = offset === 0;
            const done = i < current;
            const pct = done ? 100 : isActive ? activePct : 0;
            const R = 34;
            const CIRC = 2 * Math.PI * R;
            const Icon = phase.icon;
            return (
              <div
                key={phase.key}
                className={cn(
                  "relative flex w-64 shrink-0 flex-col items-center rounded-3xl border p-8 transition-all duration-500 ease-out",
                  isActive
                    ? "z-10 scale-100 border-teal-400/40 bg-gradient-to-b from-[#232a30] to-[#1c2228] opacity-100 shadow-2xl shadow-teal-500/10"
                    : "scale-[0.82] border-border bg-[#1e232a] opacity-45 blur-[1px]",
                )}
                style={{ transform: `translateX(${offset * 8}px) scale(${isActive ? 1 : 0.82})` }}
              >
                {/* soft teal aura behind the active card */}
                {isActive ? (
                  <div className="pointer-events-none absolute -inset-px -z-10 rounded-3xl bg-teal-500/10 blur-xl" />
                ) : null}

                <div className="relative grid size-28 place-items-center">
                  <svg viewBox="0 0 90 90" className="size-28 -rotate-90" aria-hidden="true">
                    <circle cx="45" cy="45" r={R} fill="none" strokeWidth="5" className="stroke-white/10" />
                    <circle
                      cx="45"
                      cy="45"
                      r={R}
                      fill="none"
                      strokeWidth="5"
                      strokeLinecap="round"
                      className="stroke-[#14b8a6] transition-[stroke-dashoffset] duration-700"
                      strokeDasharray={CIRC}
                      strokeDashoffset={CIRC * (1 - pct / 100)}
                    />
                  </svg>
                  <span
                    className={cn(
                      "absolute grid size-14 place-items-center rounded-full text-white transition-colors",
                      done || isActive ? "bg-[#14b8a6] shadow-lg shadow-teal-500/30" : "bg-white/10 text-muted-foreground",
                    )}
                  >
                    {done ? <Check className="size-6" /> : <Icon className="size-6" />}
                  </span>
                </div>

                <p className="mt-5 text-center text-sm font-semibold">
                  {PHRASE[phase.key] ?? phase.label}
                </p>
                <p className={cn("mt-1 text-center text-2xl font-extrabold tabular-nums", isActive ? "text-teal-300" : "text-muted-foreground")}>
                  {pct}%
                </p>
                {isActive ? (
                  <p className="mt-2 text-center text-[11px] leading-snug text-muted-foreground/70">{phase.hint}</p>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* phase position dots */}
        <div className="mt-8 flex items-center gap-2">
          {PHASES.map((phase, i) => (
            <span
              key={phase.key}
              className={cn(
                "h-1.5 rounded-full transition-all duration-500",
                i === current ? "w-6 bg-[#14b8a6]" : i < current ? "w-1.5 bg-teal-500/60" : "w-1.5 bg-white/15",
              )}
            />
          ))}
        </div>

        <h1 className="mt-8 text-center text-3xl font-extrabold uppercase tracking-tight sm:text-4xl">
          We&apos;re creating <span className="text-[#14b8a6]">your clips!</span>{" "}
          <Sparkles className="inline size-6 text-[#14b8a6]" />
        </h1>
        <p className="mx-auto mt-3 max-w-md text-center text-sm text-muted-foreground">
          You can close this window. We&apos;ll email you when your clips are ready.
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
    <div className="rounded-lg border border-border bg-card p-5">
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
function PostingQueue({ jobId, refresh = 0 }: { jobId: string; refresh?: number }) {
  const [posts, setPosts] = useState<ScheduledPost[] | null>(null);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const all = await listSchedule();
        if (!alive) return;
        const mine = all.filter((p) => p.job_id === jobId);
        setPosts(mine);
        if (mine.some((p) => p.status === "posting")) timer = setTimeout(poll, 2500);
      } catch {
        if (alive) setPosts((l) => l ?? []);
      }
    };
    void poll();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [jobId, refresh]);

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
            <div key={post.id} className="group flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
              <span
                title={post.error ?? undefined}
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  post.status === "posted"
                    ? "bg-teal-400/15 text-teal-300"
                    : post.status === "failed"
                      ? "bg-red-400/15 text-red-400"
                      : post.status === "posting"
                        ? "bg-amber-400/15 text-amber-300"
                        : post.status === "due"
                          ? "bg-teal-400/15 text-teal-300"
                          : "bg-white/5 text-muted-foreground",
                )}
              >
                {post.status === "posted"
                  ? "Posted"
                  : post.status === "failed"
                    ? "Failed"
                    : post.status === "posting"
                      ? "Posting…"
                      : post.status === "due"
                        ? "Ready to post"
                        : "Scheduled"}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">
                {post.title ?? "Clip"}
                {post.account ? (
                  <span className="ml-2 text-xs text-muted-foreground">
                    → {post.account}
                    {post.platform ? ` · ${post.platform}` : ""}
                  </span>
                ) : null}
              </span>
              {post.status === "posted" && post.result_url ? (
                <a
                  href={post.result_url}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-xs font-semibold text-teal-300 hover:text-teal-200"
                >
                  View post
                </a>
              ) : null}
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
    <div className="grid grid-cols-3 gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {job.clips.map((clip) => (
        <div key={clip.id} className="overflow-hidden rounded-lg border border-border bg-card">
          {clip.url ? (
            // biome-ignore lint/a11y/useMediaCaption: clip preview
            <video src={clip.url} controls preload="metadata" className="aspect-[9/16] w-full bg-black object-contain" />
          ) : null}
          <div className="p-3 text-center">
            <p className="line-clamp-2 text-sm font-medium">{clip.title}</p>
            <p className="text-xs text-muted-foreground">{Math.round(clip.end - clip.start)}s · ready</p>
          </div>
        </div>
      ))}
      {Array.from({ length: Math.max(0, total - done) }, (_, i) => (
        <div key={`pending-${i}`} className="overflow-hidden rounded-lg border border-border bg-card">
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

function ClipGallery({ job, onJobUpdate, selected, setSelected, onPublish }: { job: ClipsJob; onJobUpdate: (j: ClipsJob) => void; selected: Set<string>; setSelected: React.Dispatch<React.SetStateAction<Set<string>>>; onPublish: (clip: ClipItem) => void }) {
  const [editing, setEditing] = useState<ClipItem | null>(null);
  // Per-clip caption state (overlay + what Download burns). Defaults from job settings.
  const jobCc: CcState = {
    on: (job.params as { captions?: boolean }).captions !== false,
    style: ((job.params as { caption_style?: string }).caption_style as CcState["style"]) ?? "clean",
  };
  const [ccMap, setCcMap] = useState<Record<string, CcState>>({});
  const [downloading, setDownloading] = useState<string | null>(null);
  const [sort, setSort] = useState<"score" | "time">("score");
  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });


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
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground">
          <Checkbox
            checked={selected.size === clips.length && clips.length > 0}
            onCheckedChange={(v) => setSelected(v === true ? new Set(clips.map((c) => c.id)) : new Set())}
          />
          Select all · {clips.length} clips
        </label>
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
                className="flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-white/5"
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
              onOpenEditor={() => clipsToProject(job.id, [clip.id])}
              selected={selected.has(clip.id)}
              onToggleSelect={() => toggleSelect(clip.id)}
              onPublish={() => onPublish(clip)}
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
  onOpenEditor,
  selected,
  onToggleSelect,
  onPublish,
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
  onOpenEditor: () => Promise<{ workflow_id: string }>;
  selected: boolean;
  onToggleSelect: () => void;
  onPublish: () => void;
}) {
  const segments = (job.transcript ?? []).filter((s) => s.end > clip.start && s.start < clip.end);
  const router = useRouter();
  const [opening, setOpening] = useState(false);
  const openEditor = () => {
    setOpening(true);
    onOpenEditor()
      .then(({ workflow_id }) => router.push(`/video-editor?project=${workflow_id}`))
      .catch(() => setOpening(false));
  };
  return (
    <div
      id={`clip-${clip.id}`}
      className={cn(
        "scroll-mt-6 rounded-lg border bg-card p-4 transition-colors",
        selected ? "border-teal-400/60" : "border-border",
      )}
    >
      <div className="flex flex-col gap-5 sm:flex-row">
        {/* player */}
        <div className="relative w-full shrink-0 overflow-hidden rounded-lg sm:w-[240px]">
          <span className="absolute left-2 top-2 z-20">
            <Checkbox checked={selected} onCheckedChange={onToggleSelect} className="bg-black/50" />
          </span>
          <ClipPlayer
            clip={clip}
            transcript={job.transcript ?? []}
            cc={cc}
            onCcChange={onCcChange}
            customStyle={(job.params as { caption_custom?: CustomCaptionStyle | null }).caption_custom ?? null}
            headline={(job.params as { headline?: { enabled: boolean; bg: string; color: string; text?: string } }).headline ?? null}
          />
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
                aria-label="Open this clip in the editor"
                title="Edit in editor"
                disabled={opening || clip.status === "rendering"}
                onClick={openEditor}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
              >
                {opening ? <Loader2 className="size-4 animate-spin" /> : <Clapperboard className="size-4" />}
              </button>
              <button
                type="button"
                aria-label="Trim clip"
                title="Trim & captions"
                disabled={clip.status === "rendering"}
                onClick={onEdit}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
              >
                <Scissors className="size-4" />
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
              onClick={onPublish}
              className="flex items-center gap-2 rounded-lg border border-teal-400/40 px-4 py-2 text-sm font-semibold text-teal-300 transition-colors hover:bg-teal-400/10"
            >
              <SendHorizontal className="size-4" />
              Publish
            </button>
            <button
              type="button"
              disabled={downloading}
              onClick={onDownload}
              className="flex items-center gap-2 rounded-lg bg-teal-400 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-300 disabled:opacity-60"
            >
              {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              Download
            </button>
          </div>

          {clip.reason ? (
            <div className="mt-3 rounded-lg bg-white/5 px-3.5 py-2.5">
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
