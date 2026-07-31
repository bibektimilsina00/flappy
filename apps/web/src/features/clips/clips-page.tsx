"use client";

import {
  ArrowDown,
  ArrowRight,
  Check,
  ChevronDown,
  Clapperboard,
  ExternalLink,
  Film,
  Flame,
  FolderOpen,
  Link2,
  Loader2,
  Lock,
  Play,
  Scissors,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  XCircle,
  Zap,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Checkbox } from "@/components/ui/checkbox";
import { createWorkflow } from "@/features/projects/services/workflows-api";
import { EditorModeTabs } from "@/shared/components/editor-mode-tabs";
import { useBalance } from "@/features/billing";
import { CaptionStylePicker } from "./caption-templates";
import { defaultSchedule, ScheduleModal } from "./schedule-modal";
import {
  type ClipsJob,
  type ClipsParams,
  createClipsJob,
  deleteClipsJob,
  jobByWorkflow,
  listClipsJobs,
  estimateClipsCost,
  probeClipsSource,
  uploadClipsSource,
} from "./api";

const DEFAULTS: ClipsParams = {
  quality: "1080p",
  layout: "fit",
  count: "auto",
  duration: "auto",
  ratio: "9:16",
  focus: "",
  captions: true,
  caption_style: "clean",
  framing: true,
  add_emojis: true,
  highlight_keywords: true,
  censor: false,
};

const PHASE_LABEL: Record<string, string> = {
  ingest: "Fetching video",
  transcribe: "Transcribing",
  select: "Picking moments",
  render: "Rendering clips",
};

// Mini brand glyphs for the "supported links" hint (white, 14px — fidelity over detail).
type GlyphProps = { className?: string };
const Glyph = (d: string) =>
  function BrandGlyph({ className }: GlyphProps) {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" fillRule="evenodd" aria-hidden="true">
        <path d={d} />
      </svg>
    );
  };

const PLATFORMS: { name: string; icon: React.ComponentType<GlyphProps> }[] = [
  {
    name: "YouTube",
    icon: Glyph(
      "M21.58 7.19a2.5 2.5 0 0 0-1.76-1.77C18.25 5 12 5 12 5s-6.25 0-7.82.42A2.5 2.5 0 0 0 2.42 7.19 26 26 0 0 0 2 12a26 26 0 0 0 .42 4.81 2.5 2.5 0 0 0 1.76 1.77C5.75 19 12 19 12 19s6.25 0 7.82-.42a2.5 2.5 0 0 0 1.76-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.42-4.81zM10 15V9l5.2 3z",
    ),
  },
  {
    name: "TikTok",
    icon: Glyph(
      "M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.3 0 .6.05.88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z",
    ),
  },
  {
    name: "Vimeo",
    icon: Glyph(
      "M22 8.1c-.1 2-1.5 4.8-4.2 8.2-2.8 3.6-5.1 5.4-7 5.4-1.2 0-2.2-1.1-3-3.3L6.2 12c-.6-2.2-1.2-3.3-2-3.3-.2 0-.7.3-1.7 1L1.5 8.4c1.1-.9 2.1-1.9 3.1-2.8 1.4-1.2 2.4-1.8 3.1-1.9 1.6-.2 2.6.9 3 3.3.4 2.5.7 4.1.9 4.7.5 2.2 1 3.3 1.6 3.3.4 0 1.1-.7 2-2.1.9-1.4 1.3-2.4 1.4-3.1.1-1.2-.3-1.8-1.4-1.8-.5 0-1 .1-1.6.3 1-3.4 3-5 5.9-4.9 2.1.1 3.1 1.5 2.5 4.7z",
    ),
  },
  {
    name: "Twitch",
    icon: Glyph(
      "M6 0 1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714zM11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714z",
    ),
  },
  {
    name: "X",
    icon: Glyph(
      "M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.46l8.6-9.83L0 1.15h7.59l5.24 6.93zm-1.29 19.5h2.04L6.49 3.24H4.3z",
    ),
  },
  {
    name: "Facebook",
    icon: Glyph(
      "M13.4 21v-8.1h2.72l.4-3.16H13.4V7.72c0-.91.25-1.53 1.56-1.53h1.67V3.36c-.29-.04-1.28-.13-2.43-.13-2.4 0-4.05 1.47-4.05 4.16v2.32H7.43v3.16h2.72V21h3.25z",
    ),
  },
  {
    name: "Google Drive",
    icon: Glyph(
      "M8.29 3.03h7.42l6.57 11.38h-7.42zM7.14 4.03l3.71 6.43-6.56 11.37L.58 15.4zM9.44 16.5h13.14l-3.43 5.94H6.01z",
    ),
  },
];

interface SourceMeta {
  title: string | null;
  duration: number | null;
  thumbnail: string | null;
  height: number | null;
}

export function ClipsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [value, setValue] = useState("");
  const [params, setParams] = useState<ClipsParams>(DEFAULTS);
  const [busy, setBusy] = useState<string | null>(null); // "upload: name" | "start"
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [hint, setHint] = useState(false);
  const [jobs, setJobs] = useState<ClipsJob[] | null>(null);
  // Two-step flow: pick a source, then configure before the job starts.
  const [step, setStep] = useState<"input" | "config">("input");
  // Link the platform refuses to hand over — shown as a card steering to upload.
  const [blocked, setBlocked] = useState<{
    url: string;
    title: string | null;
    thumbnail: string | null;
    message: string;
  } | null>(null);
  const [source, setSource] = useState<{ source_url?: string; source_key?: string } | null>(null);
  const [meta, setMeta] = useState<SourceMeta | null>(null);
  const [title, setTitle] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  // The linked project. Arrives via ?project= (a project's Clips tab) or is
  // created eagerly on paste/upload so the job is in recents before it starts.
  const search = useSearchParams();
  const [projectId, setProjectId] = useState<string | null>(search.get("project"));

  // Poll the list while anything is running so Recent shows live progress.
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const list = await listClipsJobs();
        if (!alive) return;
        setJobs(list);
        if (list.some((j) => j.status === "queued" || j.status === "running")) timer = setTimeout(poll, 3000);
      } catch {
        if (alive) setJobs((l) => l ?? []);
      }
    };
    void poll();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  // Coming back to a project's Clips tab: a started job wins (progress page);
  // otherwise restore the saved draft and land on the config step.
  useEffect(() => {
    if (!projectId) return;
    jobByWorkflow(projectId)
      .then(({ job_id }) => router.replace(`/clips/${job_id}`))
      .catch(() => {
        try {
          const d = JSON.parse(localStorage.getItem(`riocut-clips-draft-${projectId}`) ?? "");
          setSource(d.source);
          setMeta(d.meta);
          setTitle(d.title ?? "");
          setParams(d.params ?? DEFAULTS);
          setStep("config");
        } catch {
          /* no draft yet */
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the draft saved while configuring; cleared on start / back.
  useEffect(() => {
    if (step !== "config" || !source || !projectId) return;
    localStorage.setItem(`riocut-clips-draft-${projectId}`, JSON.stringify({ source, meta, title, params }));
  }, [step, source, meta, title, params, projectId]);

  const ensureProject = useCallback(
    async (name: string) => {
      if (projectId) return;
      try {
        const wf = await createWorkflow((name || "Clips project").slice(0, 80));
        setProjectId(wf.id);
        void qc.invalidateQueries({ queryKey: ["workflows"] });
        router.replace(`/clips?project=${wf.id}`);
      } catch {
        /* ponytail: draft just won't survive navigation; the job still links on start */
      }
    },
    [projectId, router, qc],
  );

  const start = useCallback(async () => {
    if (!source) return;
    setBusy("start");
    setError(null);
    try {
      const job = await createClipsJob({
        ...source,
        workflow_id: projectId ?? undefined,
        source_title: title.trim() || undefined,
        params,
      });
      if (projectId) localStorage.removeItem(`riocut-clips-draft-${projectId}`);
      // The project (created or renamed server-side) and its clips link changed.
      void qc.invalidateQueries({ queryKey: ["workflows"] });
      void qc.invalidateQueries({ queryKey: ["clips-by-workflow"] });
      router.push(`/clips/${job.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the job");
      setBusy(null);
    }
  }, [source, title, params, projectId, router, qc]);

  const onFile = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setBusy(`Uploading ${file.name}…`);
    setError(null);
    setBlocked(null);
    try {
      const { source_key } = await uploadClipsSource(file);
      setSource({ source_key });
      setMeta({ title: file.name.replace(/\.[^.]+$/, ""), duration: null, thumbnail: null, height: null });
      setTitle(file.name.replace(/\.[^.]+$/, ""));
      setStep("config");
      void ensureProject(file.name.replace(/\.[^.]+$/, ""));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  }, [ensureProject]);

  const submit = async (explicit?: string) => {
    const url = (explicit ?? value).trim();
    if (!url) {
      fileRef.current?.click();
      return;
    }
    setBusy("Reading link…");
    setError(null);
    setBlocked(null);
    try {
      const m = await probeClipsSource(url);
      if (m.blocked) {
        setBlocked({
          url,
          title: m.title,
          thumbnail: m.thumbnail,
          message: m.message ?? "This video can't be fetched — upload the file instead.",
        });
        return;
      }
      setSource({ source_url: url });
      setMeta(m);
      setTitle(m.title ?? "");
      setStep("config");
      void ensureProject(m.title ?? "Clips project");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that link");
    } finally {
      setBusy(null);
    }
  };

  const backToInput = () => {
    if (projectId) localStorage.removeItem(`riocut-clips-draft-${projectId}`);
    setStep("input");
    setSource(null);
    setMeta(null);
    setError(null);
  };

  return (
    <div className="flex h-full w-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="relative mx-auto w-full max-w-4xl px-6 py-12">
      {/* ambient glow */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-120px] h-[340px] w-[640px] -translate-x-1/2 rounded-full bg-teal-500/10 blur-[110px]" />
      </div>

      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          One long video.{" "}
          <span className="text-teal-300">
            Ten viral clips.
          </span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Paste a link or drop a file. Riocut listens to every word, finds the strongest moments, and
          hands you captioned, face-framed clips ready to post.
        </p>
      </div>

      {step === "config" && source ? (
        <ConfigPanel
          meta={meta}
          title={title}
          setTitle={setTitle}
          params={params}
          setParams={setParams}
          busy={busy}
          error={error}
          onStart={() => void start()}
          onBack={backToInput}
        />
      ) : (
        <>
      {/* The one input — pick a source, configure on the next step */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void onFile(e.dataTransfer.files?.[0]);
        }}
        className="relative"
      >
        <div
          onMouseEnter={() => setHint(true)}
          onMouseLeave={() => setHint(false)}
          className={cn(
            "relative flex h-16 items-center gap-3 rounded-2xl border bg-[#161616] pl-5 pr-2 shadow-[0_8px_40px_-16px_rgba(0,0,0,0.8)] transition-colors",
            "focus-within:border-teal-400/60",
            dragging ? "border-teal-400" : "border-white/12",
          )}
        >
          <Link2 className="size-[18px] shrink-0 text-muted-foreground" />
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setHint(true)}
            onBlur={() => setHint(false)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            onPaste={(e) => {
              const text = e.clipboardData.getData("text").trim();
              if (/^https?:\/\/\S+$/.test(text)) {
                e.preventDefault();
                setValue(text);
                void submit(text);
              }
            }}
            placeholder="Drop a video link…"
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/70"
          />
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void submit()}
            className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-teal-400 px-5 text-sm font-semibold text-black transition-colors hover:bg-teal-300 disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Scissors className="size-4" />}
            {busy ? "Working…" : "Get clips"}
          </button>

          {/* supported-platforms hint — shows on hover/focus of the link bar */}
          {hint && !dragging ? (
            <div className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 rounded-xl border border-white/10 bg-[#1e1e1e] px-4 py-3 text-sm text-foreground/90 shadow-2xl animate-in fade-in-0 slide-in-from-bottom-1 duration-150">
              <span className="mr-1">Drop a video link from</span>
              {PLATFORMS.map((p, i) => (
                <span key={p.name} className="inline-flex items-center gap-1 whitespace-nowrap">
                  <p.icon className="size-3.5" />
                  {p.name}
                  {i < PLATFORMS.length - 1 ? <span className="mr-1">,</span> : null}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {/* blocked link — card steering to download-then-upload */}
        {blocked ? (
          <div className="mt-4 flex items-center gap-4 rounded-2xl border border-amber-400/25 bg-amber-400/[0.04] p-4">
            {blocked.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={blocked.thumbnail}
                alt=""
                className="h-20 w-32 shrink-0 rounded-lg object-cover"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              {blocked.title ? (
                <p className="truncate text-sm font-semibold">{blocked.title}</p>
              ) : null}
              <p className="mt-1 text-xs leading-relaxed text-amber-200/90">{blocked.message}</p>
              <div className="mt-2 flex items-center gap-2">
                <a
                  href={blocked.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/5"
                >
                  <ExternalLink className="size-3.5" /> Open on YouTube
                </a>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-400 px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-teal-300"
                >
                  <Upload className="size-3.5" /> Upload the file
                </button>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Tip: use tools like{" "}
                <a
                  href="https://app.ytdown.to/en38/"
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  ytdown.to
                </a>{" "}
                to download the video, then drop the file here.
              </p>
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setBlocked(null)}
              className="self-start text-muted-foreground transition-colors hover:text-foreground"
            >
              <XCircle className="size-4" />
            </button>
          </div>
        ) : null}

        {/* big browse / drop zone */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className={cn(
            "mt-4 grid w-full place-items-center rounded-2xl border-2 border-dashed py-16 transition-colors",
            dragging ? "border-teal-400 bg-teal-400/5" : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]",
          )}
        >
          <span className="relative mb-4 grid size-16 place-items-center">
            <span className="absolute inset-0 rounded-2xl bg-teal-400/10" />
            <FolderOpen className="relative size-8 text-teal-300" strokeWidth={1.5} />
          </span>
          <span className="text-[15px]">
            <span className="font-semibold text-teal-300">Click to browse</span>{" "}
            <span className="text-foreground/90">or drag &amp; drop</span>
          </span>
          <span className="mt-1 text-xs text-muted-foreground">
            Supported file type: video · up to 2 GB
          </span>
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            void onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        {/* drop overlay */}
        {dragging ? (
          <div className="pointer-events-none absolute inset-x-0 -top-3 bottom-[-8px] z-10 grid place-items-center rounded-3xl border-2 border-dashed border-teal-400 bg-[#0f0f0f]/90">
            <p className="flex items-center gap-2 text-sm font-medium text-teal-300">
              <Upload className="size-4" /> Drop your video to start
            </p>
          </div>
        ) : null}

        {error ? <p className="mt-3 text-center text-xs text-red-400">{error}</p> : null}
        <p className="mt-3 text-center text-[11px] text-muted-foreground/50">
          Sources up to 2 hours · only import content you have the rights to use
        </p>
      </div>

      {/* How it works — with the user's own latest result once one exists */}
      <Showcase demo={jobs?.find((j) => j.status === "completed" && j.clips.some((c) => c.url)) ?? null} />

      {/* Recents */}
      {jobs && jobs.length > 0 ? (
        <div className="mt-10">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Recent</h2>
          <div className="space-y-2">
            {jobs.map((job) => (
              <JobRow
                key={job.id}
                job={job}
                onOpen={() => router.push(`/clips/${job.id}`)}
                onDelete={() => {
                  void deleteClipsJob(job.id).then(() => setJobs((l) => (l ?? []).filter((j) => j.id !== job.id)));
                }}
              />
            ))}
          </div>
        </div>
      ) : null}
        </>
      )}
        </div>
      </div>
      {projectId ? <EditorModeTabs projectId={projectId} mode="clips" /> : null}
    </div>
  );
}

// Knob is anchored with `left` (buttons center static content, which pushed a
// translate-only knob out of the track).
function Switch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-teal-400" : "bg-white/15")}
    >
      <span
        className={cn(
          "absolute top-0.5 size-5 rounded-full bg-white shadow transition-[left] duration-150",
          checked ? "left-[22px]" : "left-0.5",
        )}
      />
    </button>
  );
}

const fmtDur = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

// "Source -> AI -> clips" strip. With a completed job, it shows the user's own
// poster and top clips; otherwise a neutral placeholder mock.
function Showcase({ demo }: { demo: ClipsJob | null }) {
  const top = demo ? [...demo.clips].filter((c) => c.url).sort((a, b) => b.score - a.score).slice(0, 3) : [];
  // middle card lifted, side cards tilted — same fan for real and mock media
  const fan = [
    { tilt: "-6deg", lift: "" },
    { tilt: "0deg", lift: "-translate-y-3" },
    { tilt: "6deg", lift: "" },
  ];
  const mock = [
    { hue: "from-fuchsia-500/70 to-violet-600/70", score: 92, caption: "the wild part is…" },
    { hue: "from-teal-400/70 to-emerald-600/70", score: 88, caption: "nobody talks about" },
    { hue: "from-amber-400/70 to-orange-600/70", score: 81, caption: "here's the secret" },
  ];

  return (
    <div className="mt-14 grid items-center gap-6 md:grid-cols-[1fr_auto_1fr]">
      {/* source */}
      <div className="mx-auto w-full max-w-[300px]">
        <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-slate-800 to-slate-900">
          {demo?.source_thumb_url ? (
            // biome-ignore lint/a11y/useAltText: showcase poster
            <img src={demo.source_thumb_url} className="absolute inset-0 size-full object-cover" />
          ) : null}
          <div className="absolute inset-0 grid place-items-center bg-black/20">
            <span className="grid size-10 place-items-center rounded-full bg-white/10 backdrop-blur">
              <Play className="ml-0.5 size-4 fill-white text-white" />
            </span>
          </div>
          <div className="absolute inset-x-3 bottom-2.5">
            <div className="h-1 rounded-full bg-white/20">
              <div className="h-full w-1/3 rounded-full bg-teal-400" />
            </div>
          </div>
        </div>
        <p className="mt-2 truncate text-center text-xs text-muted-foreground">
          {demo
            ? (demo.source_title ?? "Your latest video") +
              (demo.duration ? ` · ${Math.max(1, Math.round(demo.duration / 60))} min` : "")
            : "Your 20-minute video"}
        </p>
      </div>

      {/* arrow */}
      <div className="flex flex-col items-center gap-1 text-teal-300">
        <ArrowRight className="hidden size-5 md:block" />
        <ArrowDown className="size-5 md:hidden" />
        <p className="w-24 text-center text-[11px] leading-tight text-muted-foreground">AI finds the moments</p>
      </div>

      {/* clips fan */}
      <div className="mx-auto flex items-end justify-center gap-3">
        {fan.map((f, i) => {
          const clip = top[i];
          return (
            <div
              key={clip?.id ?? i}
              style={{ "--tilt": f.tilt, animationDelay: `${i * 0.6}s` } as React.CSSProperties}
              className={cn(
                "relative h-40 w-24 overflow-hidden rounded-xl border border-white/15 shadow-xl animate-[clip-float_5s_ease-in-out_infinite]",
                clip ? "bg-black" : cn("bg-gradient-to-br", mock[i].hue),
                f.lift,
              )}
            >
              {clip?.url ? (
                // biome-ignore lint/a11y/useMediaCaption: showcase thumbnail
                <video src={clip.url} muted playsInline preload="metadata" className="absolute inset-0 size-full object-cover" />
              ) : null}
              <span className="absolute left-1.5 top-1.5 flex items-center gap-0.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white">
                <Flame className="size-2.5 text-orange-400" />
                {clip?.score ?? mock[i].score}
              </span>
              <span className="absolute inset-x-1.5 bottom-2 line-clamp-2 rounded-md bg-black/60 px-1.5 py-1 text-center text-[9px] font-semibold leading-tight text-white">
                {(clip?.title ?? mock[i].caption).split(" ").map((w, j) => (
                  <span key={`${w}-${j}`} className={j === 1 ? "text-teal-300" : ""}>
                    {w}{" "}
                  </span>
                ))}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Step 2: configure the job (OpusClip-style) before it starts.
function ConfigPanel({
  meta,
  title,
  setTitle,
  params,
  setParams,
  busy,
  error,
  onStart,
  onBack,
}: {
  meta: SourceMeta | null;
  title: string;
  setTitle: (t: string) => void;
  params: ClipsParams;
  setParams: React.Dispatch<React.SetStateAction<ClipsParams>>;
  busy: string | null;
  error: string | null;
  onStart: () => void;
  onBack: () => void;
}) {
  const tooLong = (meta?.duration ?? 0) > 120 * 60;
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [cost, setCost] = useState<number | null>(null);
  const { data: balance } = useBalance();

  useEffect(() => {
    estimateClipsCost(params.count)
      .then(({ credits }) => setCost(credits))
      .catch(() => setCost(null));
  }, [params.count]);
  const insufficient = cost !== null && balance !== undefined && balance.balance < cost;
  const isFree = (balance?.plan ?? "free") === "free";
  // Free plan can't hold a paid-only quality (e.g. restored draft or default).
  useEffect(() => {
    if (isFree && params.quality !== "720p") setParams((p) => ({ ...p, quality: "720p" }));
  }, [isFree, params.quality, setParams]);
  return (
    <div className="space-y-5">
      {/* source chip */}
      <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#161616] p-4">
        {meta?.thumbnail ? (
          // biome-ignore lint/a11y/useAltText: source thumbnail
          <img src={meta.thumbnail} className="h-16 w-28 shrink-0 rounded-lg object-cover" />
        ) : (
          <span className="grid h-16 w-28 shrink-0 place-items-center rounded-lg bg-white/5">
            <Film className="size-6 text-muted-foreground/60" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Video title"
            className="w-full rounded-lg bg-transparent px-1 py-0.5 text-[15px] font-semibold outline-none transition-colors hover:bg-white/5 focus:bg-white/5"
          />
          <div className="mt-1.5 flex gap-1.5 px-1">
            {meta?.height ? (
              <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[11px] text-muted-foreground">{meta.height}p</span>
            ) : null}
            {meta?.duration ? (
              <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground">
                {fmtDur(meta.duration)}
              </span>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
        >
          Change
        </button>
      </div>

      {tooLong ? (
        <p className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-2.5 text-xs text-amber-300">
          This video is longer than the 2-hour limit — the job will fail. Pick a shorter source.
        </p>
      ) : null}

      {/* format fields — standalone row above the group */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <FieldSelect
            label="Layout"
            value={params.layout ?? "fit"}
            options={["fit", "fill"]}
            display={(v) => (v === "fit" ? "Fit (no crop)" : "Fill (crop)")}
            onChange={(v) => setParams((p) => ({ ...p, layout: v as ClipsParams["layout"] }))}
          />
        <FieldSelect
            label="Quality"
            value={params.quality ?? "1080p"}
            options={["720p", "1080p"]}
            display={(v) => (v === "1080p" ? "1080p HD" : "720p")}
            locked={(v) => v === "1080p" && isFree}
            onChange={(v) => setParams((p) => ({ ...p, quality: v as ClipsParams["quality"] }))}
          />
        <FieldSelect
            label="Ratio"
            value={params.ratio}
            options={["9:16", "1:1", "16:9"]}
            display={(v) => v}
            onChange={(v) => setParams((p) => ({ ...p, ratio: v as ClipsParams["ratio"] }))}
          />
          <LengthSelect
            value={params.duration}
            onChange={(v) => setParams((p) => ({ ...p, duration: v }))}
          />
          <FieldSelect
            label="Clips"
            value={String(params.count)}
            options={["auto", "1", "2", "3", "5", "8", "10"]}
            display={(v) => (v === "auto" ? "Auto" : v)}
            onChange={(v) => setParams((p) => ({ ...p, count: v === "auto" ? "auto" : Number(v) }))}
          />
          <FieldSelect
            label="Face framing"
            value={params.framing ? "on" : "off"}
            options={["on", "off"]}
            display={(v) => (v === "on" ? "Auto" : "Off")}
            onChange={(v) => setParams((p) => ({ ...p, framing: v === "on" }))}
          />
      </div>

      {/* group 1: templates + caption extras */}
      <div className="space-y-6 rounded-3xl border border-white/[0.05] bg-white/[0.02] p-6">
        <CaptionStylePicker
          captions={params.captions}
          style={params.caption_style}
          custom={params.caption_custom ?? null}
          headline={params.headline?.enabled ? params.headline : null}
          ratio={params.ratio}
          layout={params.layout ?? "fit"}
          watermark={isFree}
          onChange={(patch) => setParams((p) => ({ ...p, ...patch }))}
        />

        {/* clip title banner */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <label className="flex cursor-pointer items-center gap-3 text-[15px]">
            <Checkbox
              checked={Boolean(params.headline?.enabled)}
              onCheckedChange={(v) =>
                setParams((p) => ({
                  ...p,
                  headline: { bg: "#FFFFFF", color: "#000000", ...p.headline, enabled: v === true },
                }))
              }
            />
            Show clip title on video
          </label>
          {params.headline?.enabled ? (
            <>
              <div className="flex gap-1.5">
                {(
                  [
                    { bg: "#000000", color: "#FFFFFF" },
                    { bg: "#FFFFFF", color: "#000000" },
                    { bg: "none", color: "#FFD700" },
                  ] as const
                ).map((v) => (
                  <button
                    key={v.bg}
                    type="button"
                    aria-label={`Title style ${v.bg}`}
                    onClick={() => setParams((p) => ({ ...p, headline: { ...p.headline!, bg: v.bg, color: v.color } }))}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-[10px] font-extrabold uppercase transition-all",
                      params.headline?.bg === v.bg ? "border-teal-400 ring-1 ring-teal-400" : "border-white/15 hover:border-white/35",
                      v.bg === "none" && "[text-shadow:0_1px_2px_rgba(0,0,0,0.9)]",
                    )}
                    style={{ background: v.bg === "none" ? "transparent" : v.bg, color: v.color }}
                  >
                    Abc
                  </button>
                ))}
              </div>
              <input
                value={params.headline?.text ?? ""}
                onChange={(e) => setParams((p) => ({ ...p, headline: { ...p.headline!, text: e.target.value } }))}
                placeholder="Uses each clip's AI title — or type your own"
                className="min-w-64 flex-1 rounded-xl border border-white/10 bg-[#161616] px-3.5 py-2 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-teal-400/50"
              />
            </>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-white/[0.06] pt-5 sm:grid-cols-3">
          {(
            [
              ["add_emojis", "Add emojis", "AI drops a fitting emoji into key lines"],
              ["highlight_keywords", "Highlight keywords", "AI colors the 1–2 words that matter"],
              ["censor", "Auto-censor", "Masks profanity in captions"],
            ] as const
          ).map(([key, label, hint]) => (
            <label key={key} className="flex cursor-pointer items-center gap-3 text-[15px]" title={hint}>
              <Checkbox
                checked={Boolean(params[key])}
                onCheckedChange={(v) => setParams((p) => ({ ...p, [key]: v === true }))}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* group 2: focus */}
      <div className="rounded-3xl border border-white/[0.05] bg-white/[0.02] p-6">
        <p className="mb-3 text-[15px] font-semibold">
          Find clip moment <span className="ml-1 text-sm font-normal text-muted-foreground">Optional</span>
        </p>
        <input
          value={params.focus ?? ""}
          onChange={(e) => setParams((p) => ({ ...p, focus: e.target.value }))}
          placeholder="For example: when they talk about pricing strategy."
          className="w-full rounded-xl border border-white/10 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-teal-400/50"
        />
      </div>

      {/* group 3: auto-schedule */}
      <div className="rounded-3xl border border-white/[0.05] bg-white/[0.02] p-6">
        <div className="flex items-center justify-between">
          <span>
            <span className="block text-[15px] font-semibold">Schedule clips</span>
            <span className="mt-0.5 block text-sm text-muted-foreground">
              Schedule automatically when clips are ready. Save 1 step.
            </span>
          </span>
          <Switch
            checked={Boolean(params.schedule?.enabled)}
            onChange={() =>
              setParams((p) => ({
                ...p,
                schedule: p.schedule?.enabled ? { ...p.schedule, enabled: false } : (p.schedule ?? defaultSchedule()),
              }))
            }
          />
        </div>
        {params.schedule?.enabled ? (
          <div className="mt-4 flex items-stretch gap-3">
            <p className="flex flex-1 items-center rounded-xl border border-white/10 px-4 py-3 text-[15px]">
              <span>
                All clips will be scheduled from{" "}
                <span className="font-semibold">
                  {new Date(`${params.schedule.start_date}T00:00`).toLocaleDateString()}
                </span>
                , at <span className="font-semibold">{params.schedule.per_day} clips/day</span>
                {params.schedule.min_score ? (
                  <span className="text-muted-foreground"> · score ≥ {params.schedule.min_score}</span>
                ) : null}
                .
              </span>
            </p>
            <button
              type="button"
              onClick={() => setScheduleOpen(true)}
              className="flex shrink-0 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm transition-colors hover:bg-white/5"
            >
              <SlidersHorizontal className="size-4" />
              Settings
            </button>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        disabled={busy !== null || tooLong || insufficient}
        onClick={onStart}
        className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-teal-400 py-3.5 text-sm font-semibold text-black shadow-[0_8px_30px_-10px_rgba(45,212,191,0.55)] transition-all hover:bg-teal-300 hover:shadow-[0_10px_36px_-10px_rgba(45,212,191,0.7)] disabled:opacity-60 disabled:shadow-none"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Scissors className="size-4" />}
        {busy ? "Starting…" : params.schedule?.enabled ? "Get AI clips & Schedule" : "Get AI clips"}
        {!busy && cost !== null ? (
          <span className="absolute inset-y-0 right-4 flex items-center gap-1.5 border-l border-black/15 pl-4 text-[13px] font-semibold text-black/70">
            <Zap className="size-3.5 fill-black/70" />
            {Math.round(cost)} credits
          </span>
        ) : null}
      </button>
      {insufficient ? (
        <p className="text-center text-xs text-amber-300">
          Not enough credits — you have {Math.floor(balance?.balance ?? 0)}, this needs about {Math.round(cost ?? 0)}.
        </p>
      ) : null}
      {scheduleOpen && params.schedule ? (
        <ScheduleModal
          value={params.schedule}
          onSave={(cfg) => setParams((p) => ({ ...p, schedule: cfg }))}
          onClose={() => setScheduleOpen(false)}
        />
      ) : null}
      {error ? <p className="text-center text-xs text-red-400">{error}</p> : null}
    </div>
  );
}

const LENGTH_BANDS: { key: string; label: string }[] = [
  { key: "lt30", label: "<30s" },
  { key: "30-60", label: "30s–60s" },
  { key: "60-90", label: "60s–90s" },
  { key: "90-180", label: "90s–3mins" },
  { key: "gt180", label: ">3mins" },
];

// Clip length: "Any length" or a multi-selection of bands (checkbox dropdown).
function LengthSelect({
  value,
  onChange,
}: {
  value: "auto" | string[];
  onChange: (v: "auto" | string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = value === "auto" ? [] : value;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const toggleBand = (key: string) => {
    const next = selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key];
    onChange(next.length === 0 ? "auto" : next);
  };

  const label =
    value === "auto"
      ? "Any"
      : LENGTH_BANDS.filter((b) => selected.includes(b.key))
          .map((b) => b.label)
          .slice(0, 2)
          .join(", ") + (selected.length > 2 ? ` +${selected.length - 2}` : "");

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-xl border bg-[#161616] px-4 py-3 text-sm transition-colors",
          open ? "border-teal-400/50" : "border-white/10 hover:border-white/20",
        )}
      >
        <span className="whitespace-nowrap text-muted-foreground">Length</span>
        <span className="flex items-center gap-1.5 truncate font-medium">
          {label}
          <ChevronDown className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
        </span>
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-1.5 rounded-xl border border-white/10 bg-[#1e1e1e] p-1.5 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-100">
          <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm transition-colors hover:bg-white/5">
            <Checkbox checked={value === "auto"} onCheckedChange={() => onChange("auto")} />
            Any length
          </label>
          <div className="my-1 h-px bg-white/10" />
          {LENGTH_BANDS.map((band) => (
            <label
              key={band.key}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm transition-colors hover:bg-white/5"
            >
              <Checkbox checked={selected.includes(band.key)} onCheckedChange={() => toggleBand(band.key)} />
              {band.label}
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// Bordered full-width dropdown field (custom menu, same behavior as PillSelect).
function FieldSelect({
  label,
  value,
  options,
  display,
  onChange,
  locked,
}: {
  label: string;
  value: string;
  options: string[];
  display: (v: string) => string;
  onChange: (v: string) => void;
  // Options shown but not selectable (upsell) — renders a lock + Pro tag.
  locked?: (v: string) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-xl border bg-[#161616] px-4 py-3 text-sm transition-colors",
          open ? "border-teal-400/50" : "border-white/10 hover:border-white/20",
        )}
      >
        <span className="whitespace-nowrap text-muted-foreground">{label}</span>
        <span className="flex items-center gap-1.5 whitespace-nowrap font-medium">
          {display(value)}
          <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
        </span>
      </button>
      {open ? (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1.5 rounded-xl border border-white/10 bg-[#1e1e1e] p-1 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-100"
        >
          {options.map((o) => {
            const active = o === value;
            const isLocked = locked?.(o) ?? false;
            return (
              <button
                key={o}
                type="button"
                role="option"
                aria-selected={active}
                aria-disabled={isLocked}
                onClick={() => {
                  if (isLocked) return;
                  onChange(o);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  isLocked
                    ? "cursor-not-allowed text-muted-foreground/60"
                    : active
                      ? "bg-teal-400/10 text-teal-300"
                      : "text-foreground/90 hover:bg-white/5",
                )}
              >
                {display(o)}
                {isLocked ? (
                  <span className="flex items-center gap-1 rounded-md bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                    <Lock className="size-3" /> Pro
                  </span>
                ) : active ? (
                  <Check className="size-4" />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function JobRow({ job, onOpen, onDelete }: { job: ClipsJob; onOpen: () => void; onDelete: () => void }) {
  const running = job.status === "queued" || job.status === "running";
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/5">
        {job.status === "failed" ? (
          <XCircle className="size-4 text-red-400" />
        ) : running ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : (
          <Film className="size-4 text-muted-foreground" />
        )}
      </span>
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <span className="block truncate text-sm font-medium">
          {job.source_title ?? job.source_url ?? "Uploaded video"}
        </span>
        <span className="block text-xs text-muted-foreground">
          {job.status === "completed"
            ? `${job.clips.length} clips`
            : job.status === "failed"
              ? (job.error ?? "Failed")
              : `${PHASE_LABEL[job.phase] ?? job.phase}…`}
          {" · "}
          {new Date(job.created_at).toLocaleDateString()}
        </span>
        {running ? (
          <span className="mt-1.5 block h-1 w-full overflow-hidden rounded-full bg-white/10">
            <span
              className="block h-full rounded-full bg-teal-400 transition-[width] duration-700"
              style={{ width: `${Math.max(4, Math.round((job.progress ?? 0) * 100))}%` }}
            />
          </span>
        ) : null}
      </button>
      <button
        type="button"
        aria-label="Delete job"
        onClick={onDelete}
        className="hidden rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-red-400 group-hover:block"
      >
        <Trash2 className="size-4" />
      </button>
      <button type="button" onClick={onOpen} aria-label="Open job" className="rounded-lg p-2 text-muted-foreground hover:text-foreground">
        <ArrowRight className="size-4" />
      </button>
    </div>
  );
}

// Custom dropdown pill (native <select> can't be styled to match the theme).
function PillSelect({
  label,
  value,
  options,
  display,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  display: (v: string) => string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors",
          open ? "border-teal-400/50 bg-white/10" : "border-white/10 bg-white/5 hover:border-white/20",
        )}
      >
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{display(value)}</span>
        <ChevronDown className={cn("size-3 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute left-1/2 top-full z-30 mt-1.5 min-w-[130px] -translate-x-1/2 rounded-xl border border-white/10 bg-[#1e1e1e] p-1 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-100"
        >
          {options.map((o) => {
            const active = o === value;
            return (
              <button
                key={o}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(o);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
                  active ? "bg-teal-400/10 text-teal-300" : "text-foreground/90 hover:bg-white/5",
                )}
              >
                {display(o)}
                {active ? <Check className="size-3.5" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
