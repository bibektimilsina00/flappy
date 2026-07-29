"use client";

import {
  ArrowDown,
  ArrowRight,
  Captions,
  Check,
  ChevronDown,
  Clapperboard,
  Film,
  Flame,
  FolderOpen,
  FolderArchive,
  Link2,
  Loader2,
  Play,
  ScanFace,
  Scissors,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { defaultSchedule, ScheduleModal } from "./schedule-modal";
import {
  type ClipsJob,
  type ClipsParams,
  createClipsJob,
  deleteClipsJob,
  listClipsJobs,
  probeClipsSource,
  uploadClipsSource,
} from "./api";

const DEFAULTS: ClipsParams = {
  count: "auto",
  duration: "auto",
  ratio: "9:16",
  focus: "",
  captions: true,
  caption_style: "clean",
  framing: true,
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
  const [value, setValue] = useState("");
  const [params, setParams] = useState<ClipsParams>(DEFAULTS);
  const [busy, setBusy] = useState<string | null>(null); // "upload: name" | "start"
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [hint, setHint] = useState(false);
  const [jobs, setJobs] = useState<ClipsJob[] | null>(null);
  // Two-step flow: pick a source, then configure before the job starts.
  const [step, setStep] = useState<"input" | "config">("input");
  const [source, setSource] = useState<{ source_url?: string; source_key?: string } | null>(null);
  const [meta, setMeta] = useState<SourceMeta | null>(null);
  const [title, setTitle] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listClipsJobs().then(setJobs).catch(() => setJobs([]));
  }, []);

  const start = useCallback(async () => {
    if (!source) return;
    setBusy("start");
    setError(null);
    try {
      const job = await createClipsJob({ ...source, source_title: title.trim() || undefined, params });
      router.push(`/clips/${job.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the job");
      setBusy(null);
    }
  }, [source, title, params, router]);

  const onFile = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setBusy(`Uploading ${file.name}…`);
    setError(null);
    try {
      const { source_key } = await uploadClipsSource(file);
      setSource({ source_key });
      setMeta({ title: file.name.replace(/\.[^.]+$/, ""), duration: null, thumbnail: null, height: null });
      setTitle(file.name.replace(/\.[^.]+$/, ""));
      setStep("config");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  }, []);

  const submit = async () => {
    const url = value.trim();
    if (!url) {
      fileRef.current?.click();
      return;
    }
    setBusy("Reading link…");
    setError(null);
    try {
      const m = await probeClipsSource(url);
      setSource({ source_url: url });
      setMeta(m);
      setTitle(m.title ?? "");
      setStep("config");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that link");
    } finally {
      setBusy(null);
    }
  };

  const backToInput = () => {
    setStep("input");
    setSource(null);
    setMeta(null);
    setError(null);
  };

  return (
    <div className="relative mx-auto w-full max-w-4xl px-6 py-12">
      {/* ambient glow */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-120px] h-[340px] w-[640px] -translate-x-1/2 rounded-full bg-teal-500/10 blur-[110px]" />
      </div>

      <div className="mb-10 text-center">
        <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-teal-400/20 bg-teal-400/10 px-3 py-1 text-xs font-medium text-teal-300">
          <Sparkles className="size-3.5" /> AI clipping studio
        </p>
        <h1 className="text-4xl font-bold tracking-tight">
          One long video.{" "}
          <span className="text-teal-300">
            Ten viral clips.
          </span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Paste a link or drop a file. Flappy listens to every word, finds the strongest moments, and
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
            placeholder="Drop a video link…"
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/70"
          />
          <button
            type="button"
            disabled={busy !== null}
            onClick={submit}
            className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-teal-400 px-5 text-sm font-semibold text-black transition-colors hover:bg-teal-300 disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Scissors className="size-4" />}
            {busy ? "Working…" : "Get clips"}
          </button>

          {/* supported-platforms hint — shows on hover/focus of the link bar */}
          {hint && !dragging ? (
            <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 rounded-xl bg-[#3a4150] px-4 py-3 text-sm text-white/90 shadow-2xl animate-in fade-in-0 slide-in-from-top-1 duration-150">
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
            Supported file type: video · up to 500 MB
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
          Sources up to 30 minutes · only import content you have the rights to use
        </p>
      </div>

      {/* How it works — the transformation, illustrated */}
      <div className="mt-14 grid items-center gap-6 md:grid-cols-[1fr_auto_1fr]">
        {/* source */}
        <div className="mx-auto w-full max-w-[300px]">
          <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-slate-800 to-slate-900">
            <div className="absolute inset-0 grid place-items-center">
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
          <p className="mt-2 text-center text-xs text-muted-foreground">Your 20-minute video</p>
        </div>

        {/* arrow */}
        <div className="flex flex-col items-center gap-1 text-teal-300">
          <Sparkles className="size-5" />
          <ArrowRight className="hidden size-5 md:block" />
          <ArrowDown className="size-5 md:hidden" />
          <p className="w-24 text-center text-[11px] leading-tight text-muted-foreground">
            AI finds the moments
          </p>
        </div>

        {/* clips fan */}
        <div className="mx-auto flex items-end justify-center gap-3">
          {[
            { hue: "from-fuchsia-500/70 to-violet-600/70", score: 92, caption: "the wild part is…", tilt: "-6deg", lift: "" },
            { hue: "from-teal-400/70 to-emerald-600/70", score: 88, caption: "nobody talks about", tilt: "0deg", lift: "-translate-y-3" },
            { hue: "from-amber-400/70 to-orange-600/70", score: 81, caption: "here's the secret", tilt: "6deg", lift: "" },
          ].map((c, i) => (
            <div
              key={c.score}
              style={{ "--tilt": c.tilt, animationDelay: `${i * 0.6}s` } as React.CSSProperties}
              className={cn(
                "relative h-40 w-24 overflow-hidden rounded-xl border border-white/15 bg-gradient-to-br shadow-xl animate-[clip-float_5s_ease-in-out_infinite]",
                c.hue,
                c.lift,
              )}
            >
              <span className="absolute left-1.5 top-1.5 flex items-center gap-0.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white">
                <Flame className="size-2.5 text-orange-400" />
                {c.score}
              </span>
              <span className="absolute inset-x-1.5 bottom-2 rounded-md bg-black/60 px-1.5 py-1 text-center text-[9px] font-semibold leading-tight text-white">
                {c.caption.split(" ").map((w, j) => (
                  <span key={w} className={j === 1 ? "text-teal-300" : ""}>
                    {w}{" "}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* feature chips */}
      <div className="mt-12 flex flex-wrap items-center justify-center gap-2.5">
        {[
          { icon: Captions, label: "Word-by-word captions" },
          { icon: ScanFace, label: "Face-aware framing" },
          { icon: Flame, label: "Virality scores" },
          { icon: FolderArchive, label: "SRT + zip export" },
          { icon: Clapperboard, label: "Opens in the editor" },
        ].map(({ icon: Icon, label }) => (
          <span
            key={label}
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-foreground/80"
          >
            <Icon className="size-3.5 text-teal-300" />
            {label}
          </span>
        ))}
      </div>

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
  );
}

const fmtDur = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

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
  const tooLong = (meta?.duration ?? 0) > 30 * 60;
  const [scheduleOpen, setScheduleOpen] = useState(false);
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
          This video is longer than the 30-minute limit — the job will fail. Pick a shorter source.
        </p>
      ) : null}

      {/* fields */}
      <div className="grid gap-3 sm:grid-cols-3">
        <FieldSelect
          label="Ratio"
          value={params.ratio}
          options={["9:16", "1:1", "16:9"]}
          display={(v) => v}
          onChange={(v) => setParams((p) => ({ ...p, ratio: v as ClipsParams["ratio"] }))}
        />
        <FieldSelect
          label="Clip length"
          value={params.duration}
          options={["auto", "short", "medium", "long"]}
          display={(v) =>
            v === "auto" ? "Auto (AI decides)" : v === "short" ? "15–30s" : v === "medium" ? "30–60s" : "60–90s"
          }
          onChange={(v) => setParams((p) => ({ ...p, duration: v as ClipsParams["duration"] }))}
        />
        <FieldSelect
          label="Clips"
          value={String(params.count)}
          options={["auto", "1", "2", "3", "5", "8", "10"]}
          display={(v) => (v === "auto" ? "Auto" : v)}
          onChange={(v) => setParams((p) => ({ ...p, count: v === "auto" ? "auto" : Number(v) }))}
        />
      </div>

      {/* caption style cards */}
      <div>
        <p className="mb-2 text-sm font-medium">Caption style</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              { id: "clean", name: "Clean", bg: "from-slate-700 to-slate-900" },
              { id: "bold", name: "Bold", bg: "from-indigo-800 to-slate-900" },
              { id: "highlight", name: "Highlight", bg: "from-teal-900 to-slate-900" },
              { id: "off", name: "No captions", bg: "from-neutral-800 to-neutral-900" },
            ] as const
          ).map((card) => {
            const active = card.id === "off" ? !params.captions : params.captions && params.caption_style === card.id;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() =>
                  setParams((p) =>
                    card.id === "off"
                      ? { ...p, captions: false }
                      : { ...p, captions: true, caption_style: card.id },
                  )
                }
                className={cn(
                  "group overflow-hidden rounded-xl border text-left transition-all",
                  active ? "border-teal-400 ring-1 ring-teal-400" : "border-white/10 hover:border-white/25",
                )}
              >
                <div className={cn("relative aspect-[9/14] w-full bg-gradient-to-br", card.bg)}>
                  {active ? (
                    <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-teal-400 text-black">
                      <Check className="size-3" />
                    </span>
                  ) : null}
                  {/* sample caption in the actual style */}
                  {card.id !== "off" ? (
                    <span className="absolute inset-x-1.5 bottom-3 text-center">
                      {card.id === "clean" ? (
                        <span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                          here is your subtitle
                        </span>
                      ) : card.id === "bold" ? (
                        <span className="text-[11px] font-extrabold uppercase tracking-wide text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">
                          Here is your subtitle
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">
                          Here <span className="text-teal-300">is your</span> subtitle
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="absolute inset-0 grid place-items-center text-[11px] text-white/40">—</span>
                  )}
                </div>
                <p className="px-2.5 py-2 text-xs font-medium">{card.name}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* framing toggle */}
      <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-white/10 bg-[#161616] px-4 py-3">
        <span>
          <span className="block text-sm font-medium">Auto-framing</span>
          <span className="block text-xs text-muted-foreground">Keep faces centered when cropping to vertical</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={params.framing}
          onClick={() => setParams((p) => ({ ...p, framing: !p.framing }))}
          className={cn("relative h-6 w-11 rounded-full transition-colors", params.framing ? "bg-teal-400" : "bg-white/15")}
        >
          <span
            className={cn(
              "absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform",
              params.framing ? "translate-x-[22px]" : "translate-x-0.5",
            )}
          />
        </button>
      </label>

      {/* focus */}
      <div>
        <p className="mb-1.5 text-sm font-medium">
          Find clip moment <span className="font-normal text-muted-foreground">Optional</span>
        </p>
        <input
          value={params.focus ?? ""}
          onChange={(e) => setParams((p) => ({ ...p, focus: e.target.value }))}
          placeholder="For example: when they talk about pricing strategy."
          className="w-full rounded-xl border border-white/10 bg-[#161616] px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-teal-400/50"
        />
      </div>

      {/* auto-schedule */}
      <div className="rounded-2xl border border-white/10 bg-[#161616] p-4">
        <div className="flex items-center justify-between">
          <span>
            <span className="block text-sm font-medium">Schedule clips</span>
            <span className="block text-xs text-muted-foreground">
              Queue clips for posting automatically when they're ready. Save 1 step.
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(params.schedule?.enabled)}
            onClick={() =>
              setParams((p) => ({
                ...p,
                schedule: p.schedule?.enabled ? { ...p.schedule, enabled: false } : (p.schedule ?? defaultSchedule()),
              }))
            }
            className={cn(
              "relative h-6 w-11 shrink-0 rounded-full transition-colors",
              params.schedule?.enabled ? "bg-teal-400" : "bg-white/15",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform",
                params.schedule?.enabled ? "translate-x-[22px]" : "translate-x-0.5",
              )}
            />
          </button>
        </div>
        {params.schedule?.enabled ? (
          <div className="mt-3 flex items-center gap-2">
            <p className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm">
              All clips will be scheduled from{" "}
              <span className="font-semibold">
                {new Date(`${params.schedule.start_date}T00:00`).toLocaleDateString()}
              </span>
              , at <span className="font-semibold">{params.schedule.per_day} clips/day</span>
              {params.schedule.min_score ? (
                <span className="text-muted-foreground"> · score ≥ {params.schedule.min_score}</span>
              ) : null}
              .
            </p>
            <button
              type="button"
              onClick={() => setScheduleOpen(true)}
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 px-3.5 py-2.5 text-sm transition-colors hover:bg-white/5"
            >
              <SlidersHorizontal className="size-4" />
              Settings
            </button>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        disabled={busy !== null || tooLong}
        onClick={onStart}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-400 py-3.5 text-sm font-semibold text-black transition-colors hover:bg-teal-300 disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Scissors className="size-4" />}
        {busy ? "Starting…" : params.schedule?.enabled ? "Get AI clips & Schedule" : "Get AI clips"}
      </button>
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

// Bordered full-width dropdown field (custom menu, same behavior as PillSelect).
function FieldSelect({
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
        <span className="text-muted-foreground">{label}</span>
        <span className="flex items-center gap-1.5 font-medium">
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
                  "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  active ? "bg-teal-400/10 text-teal-300" : "text-foreground/90 hover:bg-white/5",
                )}
              >
                {display(o)}
                {active ? <Check className="size-4" /> : null}
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
