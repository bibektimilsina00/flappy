"use client";

import {
  ArrowRight,
  ChevronDown,
  Film,
  Link2,
  Loader2,
  Scissors,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import {
  type ClipsJob,
  type ClipsParams,
  createClipsJob,
  deleteClipsJob,
  listClipsJobs,
  uploadClipsSource,
} from "./api";

const DEFAULTS: ClipsParams = { count: "auto", duration: "auto", ratio: "9:16", focus: "" };

const PHASE_LABEL: Record<string, string> = {
  ingest: "Fetching video",
  transcribe: "Transcribing",
  select: "Picking moments",
  render: "Rendering clips",
};

export function ClipsPage() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [params, setParams] = useState<ClipsParams>(DEFAULTS);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null); // "upload: name" | "start"
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [jobs, setJobs] = useState<ClipsJob[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listClipsJobs().then(setJobs).catch(() => setJobs([]));
  }, []);

  const start = useCallback(
    async (source: { source_url?: string; source_key?: string }) => {
      setBusy("start");
      setError(null);
      try {
        const job = await createClipsJob({ ...source, params });
        router.push(`/clips/${job.id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not start the job");
        setBusy(null);
      }
    },
    [params, router],
  );

  const onFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setBusy(`Uploading ${file.name}…`);
      setError(null);
      try {
        const { source_key } = await uploadClipsSource(file);
        await start({ source_key });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
        setBusy(null);
      }
    },
    [start],
  );

  const submit = () => {
    const url = value.trim();
    if (!url) {
      fileRef.current?.click();
      return;
    }
    void start({ source_url: url });
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold">Turn one video into many clips</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Paste a link or drop a file — Flappy finds the best moments and cuts them into short-form clips.
        </p>
      </div>

      {/* The one input */}
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
        className={cn(
          "rounded-2xl border-2 border-dashed bg-card p-6 transition-colors",
          dragging ? "border-teal-400 bg-teal-400/5" : "border-border",
        )}
      >
        <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-1.5 focus-within:border-white/30">
          <Link2 className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Paste a YouTube / TikTok / Vimeo link, or drop a video file here"
            className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            aria-label="Upload a file"
            onClick={() => fileRef.current?.click()}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Upload a file"
          >
            <Upload className="size-4" />
          </button>
        </div>
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

        {/* Options — collapsed; the defaults are the product */}
        <button
          type="button"
          onClick={() => setOptionsOpen((v) => !v)}
          className="mt-3 flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronDown className={cn("size-3.5 transition-transform", optionsOpen && "rotate-180")} />
          Options
          {!optionsOpen ? (
            <span className="text-muted-foreground/60">
              · Auto clips · Auto length · {params.ratio} vertical
            </span>
          ) : null}
        </button>
        {optionsOpen ? (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap gap-2">
              <PillSelect
                label="Clips"
                value={String(params.count)}
                options={["auto", "1", "2", "3", "5", "8", "10"]}
                display={(v) => (v === "auto" ? "Auto" : v)}
                onChange={(v) => setParams((p) => ({ ...p, count: v === "auto" ? "auto" : Number(v) }))}
              />
              <PillSelect
                label="Length"
                value={params.duration}
                options={["auto", "short", "medium", "long"]}
                display={(v) =>
                  v === "auto" ? "Auto" : v === "short" ? "15-30s" : v === "medium" ? "30-60s" : "60-90s"
                }
                onChange={(v) => setParams((p) => ({ ...p, duration: v as ClipsParams["duration"] }))}
              />
              <PillSelect
                label="Format"
                value={params.ratio}
                options={["9:16", "1:1", "16:9"]}
                display={(v) => v}
                onChange={(v) => setParams((p) => ({ ...p, ratio: v as ClipsParams["ratio"] }))}
              />
            </div>
            <input
              value={params.focus ?? ""}
              onChange={(e) => setParams((p) => ({ ...p, focus: e.target.value }))}
              placeholder="What should we look for? e.g. “actionable advice”, “funny moments” (optional)"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/70"
            />
          </div>
        ) : null}

        <button
          type="button"
          disabled={busy !== null}
          onClick={submit}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-500 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Scissors className="size-4" />}
          {busy ?? (value.trim() ? "Get clips" : "Get clips — paste a link or pick a file")}
        </button>
        {error ? <p className="mt-2 text-center text-xs text-red-400">{error}</p> : null}
        <p className="mt-3 text-center text-[11px] text-muted-foreground/70">
          Only import content you have the rights to use. Sources up to 30 minutes.
        </p>
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
  return (
    <label className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-foreground outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {display(o)}
          </option>
        ))}
      </select>
    </label>
  );
}
