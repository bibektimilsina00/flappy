"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ArrowRight,
	CalendarClock,
	Check,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Crown,
	ExternalLink,
	Gem,
	Link2,
	Loader2,
	Plus,
	Sparkles,
	Type,
	Upload,
	XCircle,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { getWorkspace } from "@/features/account";
import { openUpgrade, useBalance } from "@/features/billing";
import { createWorkflow } from "@/features/projects/services/workflows-api";
import { cn } from "@/lib/cn";
import { EditorModeTabs } from "@/shared/components/editor-mode-tabs";
import { ClipsFanAnimation, CLIPS_PREVIEW_VIDEO as PREVIEW_VIDEO } from "@/shared/components/clips-fan-animation";
import {
	createClipsJob,
	estimateClipsCost,
	jobByWorkflow,
	listSocialAccounts,
	probeClipsSource,
	socialConnectUrl,
	socialProviders,
	uploadClipsSource,
} from "../services/clips-api";
import type { ClipsParams, SocialAccount } from "../types";
import {
	CaptionSample,
	captionCss,
	PRESET_META,
} from "../components/caption-templates";
import { extractVideoMetadata } from "../lib/local-video-meta";
import { PLATFORMS as SOCIAL_PLATFORMS } from "../components/publish-panel";
import { defaultSchedule, ScheduleModal } from "../components/schedule-modal";

const DEFAULTS: ClipsParams = {
	layout: "fill",
	count: "auto",
	duration: "auto",
	ratio: "9:16",
	focus: "",
	captions: true,
	caption_style: "clean",
	add_emojis: true,
	highlight_keywords: true,
	censor: false,
};

// Mini brand glyphs for the "supported links" hint (white, 14px — fidelity over detail).
type GlyphProps = { className?: string };
const Glyph = (d: string) =>
	function BrandGlyph({ className }: GlyphProps) {
		return (
			<svg
				viewBox="0 0 24 24"
				className={className}
				fill="currentColor"
				fillRule="evenodd"
				aria-hidden="true"
			>
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
	// Two-step flow: pick a source, then configure before the job starts.
	const [step, setStep] = useState<"input" | "config">("input");
	// Link the platform refuses to hand over — shown as a card steering to upload.
	const [blocked, setBlocked] = useState<{
		url: string;
		title: string | null;
		thumbnail: string | null;
		message: string;
	} | null>(null);
	const [source, setSource] = useState<{
		source_url?: string;
		source_key?: string;
		// Local object URL for an uploaded file so the config preview can play it.
		preview_url?: string;
	} | null>(null);
	const [meta, setMeta] = useState<SourceMeta | null>(null);
	const [title, setTitle] = useState("");
	// Live upload progress (XHR reports loaded/total bytes).
	const [upload, setUpload] = useState<{
		name: string;
		loaded: number;
		total: number;
		startedAt: number;
	} | null>(null);
	const fileRef = useRef<HTMLInputElement>(null);
	// The linked project. Arrives via ?project= (a project's Clips tab) or is
	// created eagerly on paste/upload so the job is in recents before it starts.
	const search = useSearchParams();
	const [projectId, setProjectId] = useState<string | null>(
		search.get("project"),
	);

	// Workspace clip defaults (Settings → Clip defaults) seed the params once.
	const { data: workspace } = useQuery({
		queryKey: ["workspace"],
		queryFn: getWorkspace,
	});
	const defaultsApplied = useRef(false);
	useEffect(() => {
		const d = workspace?.preferences?.clip_defaults;
		if (!d || defaultsApplied.current) return;
		defaultsApplied.current = true;
		setParams((p) => ({ ...p, ...d }) as ClipsParams);
	}, [workspace]);

	// Coming back to a project's Clips tab: a started job wins (progress page);
	// otherwise restore the saved draft and land on the config step.
	useEffect(() => {
		if (!projectId) return;
		jobByWorkflow(projectId)
			.then(({ job_id }) => router.replace(`/clips/${job_id}`))
			.catch(() => {
				try {
					const d = JSON.parse(
						localStorage.getItem(`riocut-clips-draft-${projectId}`) ?? "",
					);
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
		localStorage.setItem(
			`riocut-clips-draft-${projectId}`,
			JSON.stringify({ source, meta, title, params }),
		);
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
				source_duration: meta?.duration ?? undefined,
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
	}, [source, title, params, meta, projectId, router, qc]);

	const onFile = useCallback(
		async (file: File | undefined) => {
			if (!file) return;
			setBusy(`Uploading ${file.name}…`);
			setError(null);
			setBlocked(null);
			setUpload({
				name: file.name,
				loaded: 0,
				total: file.size,
				startedAt: Date.now(),
			});

			// Extract local video frame thumbnail, duration, and resolution
			const localMeta = await extractVideoMetadata(file);

			try {
				const { source_key } = await uploadClipsSource(file, (loaded, total) =>
					setUpload((u) => (u ? { ...u, loaded, total } : u)),
				);
				setSource({ source_key, preview_url: URL.createObjectURL(file) });
				setMeta({
					title: file.name.replace(/\.[^.]+$/, ""),
					duration: localMeta.duration || null,
					thumbnail: localMeta.thumbnail,
					height: localMeta.height || null,
				});
				setTitle(file.name.replace(/\.[^.]+$/, ""));
				setStep("config");
				void ensureProject(file.name.replace(/\.[^.]+$/, ""));
			} catch (e) {
				setError(e instanceof Error ? e.message : "Upload failed");
			} finally {
				setBusy(null);
				setUpload(null);
			}
		},
		[ensureProject],
	);

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
					message:
						m.message ??
						"This video can't be fetched — upload the file instead.",
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
		if (source?.preview_url) URL.revokeObjectURL(source.preview_url);
		setStep("input");
		setSource(null);
		setMeta(null);
		setError(null);
	};

	return (
		<div className="flex h-full w-full flex-col gap-2 p-2">
			<div className="min-h-0 flex-1 overflow-y-auto bg-background">
				<div className="relative flex h-full min-h-0 w-full flex-col p-2">
					{/* ambient glow */}
					<div
						aria-hidden
						className="pointer-events-none absolute inset-x-0 top-0 -z-10 overflow-hidden"
					>
						<div className="absolute left-1/2 top-[-120px] h-[340px] w-[640px] -translate-x-1/2 rounded-full bg-teal-500/10 blur-[110px]" />
					</div>

					{step === "config" && source ? (
						<ConfigPanel
							meta={meta}
							preview={source?.preview_url}
							title={title}
							params={params}
							setParams={setParams}
							busy={busy}
							error={error}
							onStart={() => void start()}
							onBack={backToInput}
						/>
					) : (
						<>
							<div className="grid min-h-0 flex-1 items-stretch gap-6 lg:grid-cols-[minmax(0,460px)_1fr]">
								{/* LEFT — create card */}
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
									className="relative flex min-h-0 flex-col overflow-y-auto rounded-lg border border-border bg-card p-7 shadow-xl"
								>
									<div className="flex items-start justify-between">
										<h1 className="text-2xl font-extrabold uppercase tracking-tight">
											Video In. Clips Out.
										</h1>
										<div className="mt-2 flex items-center gap-1.5">
											<span className="size-2 rounded-full bg-[#14b8a6]" />
											<span className="size-2 rounded-full bg-white/15" />
										</div>
									</div>
									<p className="mt-1.5 text-sm text-muted-foreground">
										AI cuts your video into ready-to-post clips.
									</p>

									<p className="mt-6 mb-2 text-sm font-semibold">Paste a video link</p>
									<div
										onMouseEnter={() => setHint(true)}
										onMouseLeave={() => setHint(false)}
										className={cn(
											"relative flex h-12 items-center gap-2.5 rounded-xl border bg-[#151821] px-4 transition-colors",
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
										placeholder="Paste a link and press Enter"
										className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/70"
									/>
									{busy ? (
										<Loader2 className="size-4 shrink-0 animate-spin text-teal-300" />
									) : value.trim() ? (
										<kbd className="shrink-0 rounded border border-white/15 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
											↵
										</kbd>
									) : null}

									{/* supported-platforms hint — shows on hover/focus of the link bar */}
									{hint && !dragging ? (
										<div className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 rounded-lg border border-white/10 bg-[#1e1e1e] px-4 py-3 text-sm text-foreground/90 shadow-2xl animate-in fade-in-0 slide-in-from-bottom-1 duration-150">
											<span className="mr-1">Drop a video link from</span>
											{PLATFORMS.map((p, i) => (
												<span
													key={p.name}
													className="inline-flex items-center gap-1 whitespace-nowrap"
												>
													<p.icon className="size-3.5" />
													{p.name}
													{i < PLATFORMS.length - 1 ? (
														<span className="mr-1">,</span>
													) : null}
												</span>
											))}
										</div>
									) : null}
								</div>

								{/* blocked link — card steering to upload/upgrade */}
								{blocked ? (
									<div className="mt-4 flex items-start gap-4 rounded-lg border border-amber-400/25 bg-amber-400/[0.04] p-4">
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
												<p className="truncate text-sm font-semibold">
													{blocked.title}
												</p>
											) : null}
											<p className="mt-1 text-xs leading-relaxed text-amber-200/90">
												{blocked.message}
											</p>
											<div className="mt-2 flex flex-wrap items-center gap-2">
												{blocked.message.includes("paid plan") ? (
													<button
														type="button"
														onClick={() => openUpgrade("Paste YouTube links on a paid plan")}
														className="inline-flex items-center gap-1.5 rounded-lg bg-teal-400 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-300"
													>
														<Crown className="size-3.5" /> Upgrade — from $12/mo
													</button>
												) : null}
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
													className={cn(
														"inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
														blocked.message.includes("paid plan")
															? "border border-white/15 font-medium hover:bg-white/5"
															: "bg-teal-400 text-white hover:bg-teal-300",
													)}
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

								<div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground/60">
									<span className="h-px flex-1 bg-border" />
									or
									<span className="h-px flex-1 bg-border" />
								</div>
								<p className="mb-2 text-sm font-semibold">Upload your own file</p>

								{/* big browse / drop zone box — transforms to circular progress card during upload */}
								{upload ? (
									(() => {
										const pct = upload.total
											? Math.min(100, (upload.loaded / upload.total) * 100)
											: 0;
										const mb = (b: number) =>
											(b / 1e6).toFixed(b >= 1e8 ? 0 : 1);
										const elapsed = (Date.now() - upload.startedAt) / 1000;
										const speed = elapsed > 0.5 ? upload.loaded / elapsed : 0; // bytes/s
										const remaining =
											speed > 0
												? (upload.total - upload.loaded) / speed
												: null;

										const radius = 38;
										const circumference = 2 * Math.PI * radius;
										const strokeDashoffset =
											circumference - (pct / 100) * circumference;

										return (
											<div className="relative mt-4 overflow-hidden rounded-xl border border-teal-500/30 bg-gradient-to-b from-[#181818] via-[#141414] to-[#101010] p-8 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.7),0_0_30px_-10px_rgba(45,212,191,0.15)] transition-all">
												{/* Background ambient glow */}
												<div className="pointer-events-none absolute left-1/2 top-1/2 size-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-500/10 blur-3xl" />

												<div className="relative flex flex-col items-center justify-center gap-6 text-center sm:flex-row sm:text-left">
													{/* Circular Progress Bar Indicator */}
													<div className="relative grid size-28 shrink-0 place-items-center">
														<svg
															className="size-full -rotate-90 transform"
															viewBox="0 0 100 100"
														>
															<circle
																cx="50"
																cy="50"
																r={radius}
																className="stroke-white/10"
																strokeWidth="6"
																fill="transparent"
															/>
															<circle
																cx="50"
																cy="50"
																r={radius}
																className="stroke-teal-400 transition-[stroke-dashoffset] duration-300 ease-out"
																strokeWidth="6"
																strokeDasharray={circumference}
																strokeDashoffset={strokeDashoffset}
																strokeLinecap="round"
																fill="transparent"
															/>
														</svg>
														{/* Center status percentage */}
														<div className="absolute inset-0 flex flex-col items-center justify-center">
															{pct >= 100 ? (
																<Loader2 className="size-7 animate-spin text-teal-300" />
															) : (
																<span className="text-xl font-bold tabular-nums tracking-tight text-teal-300">
																	{pct.toFixed(0)}
																	<span className="text-xs font-semibold text-teal-400/80">
																		%
																	</span>
																</span>
															)}
														</div>
													</div>

													{/* Upload details */}
													<div className="min-w-0 flex-1 space-y-2">
														<div className="flex items-center justify-center gap-2 sm:justify-start">
															<span className="inline-flex items-center gap-1.5 rounded-md border border-teal-400/20 bg-teal-400/10 px-2.5 py-1 text-xs font-medium text-teal-300">
																<Upload className="size-3.5" />
																Uploading File
															</span>
															{pct >= 100 ? (
																<span className="inline-flex items-center gap-1.5 rounded-md border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-300 animate-pulse">
																	<Loader2 className="size-3 animate-spin" />
																	Processing on server
																</span>
															) : null}
														</div>

														<h4
															className="max-w-md truncate text-base font-semibold text-foreground/95"
															title={upload.name}
														>
															{upload.name}
														</h4>

														<div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs tabular-nums text-muted-foreground sm:justify-start">
															<span>
																<strong className="font-medium text-foreground">
																	{mb(upload.loaded)}
																</strong>{" "}
																of {mb(upload.total)} MB
															</span>
															{speed > 0 ? (
																<>
																	<span className="text-white/20">•</span>
																	<span>{mb(speed)} MB/s</span>
																</>
															) : null}
															{remaining !== null &&
															remaining > 1 &&
															pct < 100 ? (
																<>
																	<span className="text-white/20">•</span>
																	<span className="font-medium text-teal-300/90">
																		{remaining > 90
																			? `${Math.round(remaining / 60)} min`
																			: `${Math.round(remaining)}s`}{" "}
																		left
																	</span>
																</>
															) : null}
														</div>
													</div>
												</div>
											</div>
										);
									})()
								) : (
									<button
										type="button"
										onClick={() => fileRef.current?.click()}
										className={cn(
											"grid w-full place-items-center rounded-xl border-2 border-dashed px-6 py-12 transition-colors",
											dragging
												? "border-teal-400 bg-teal-400/5"
												: "border-white/12 bg-[#151821] hover:border-white/25 hover:bg-white/[0.02]",
										)}
									>
										<span className="grid size-12 place-items-center rounded-full bg-[#14b8a6] text-white shadow-lg shadow-teal-500/20">
											<Upload className="size-5" strokeWidth={2} />
										</span>
										<span className="mt-3 text-sm font-semibold">Upload video</span>
										<span className="mt-0.5 text-xs text-muted-foreground">
											<span className="font-medium text-teal-300 underline underline-offset-2">
												Choose files
											</span>{" "}
											or drag them here
										</span>
									</button>
								)}

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
									<div className="pointer-events-none absolute inset-x-0 -top-3 bottom-[-8px] z-10 grid place-items-center rounded-lg border-2 border-dashed border-teal-400 bg-[#0f0f0f]/90">
										<p className="flex items-center gap-2 text-sm font-medium text-teal-300">
											<Upload className="size-4" /> Drop your video to start
										</p>
									</div>
								) : null}

								{error ? (
									<p className="mt-3 text-center text-xs text-red-400">
										{error}
									</p>
								) : null}
								<p className="mt-auto pt-6 text-center text-[11px] text-muted-foreground/50">
									Sources up to 2 hours (30 min on Free) · only import content
									you have the rights to use
								</p>

									<p className="mt-5 text-center text-xs text-muted-foreground">
										By generating a video, you agree to our{" "}
										<a href="/terms" className="text-teal-300 hover:underline">
											Terms of Service
										</a>
										.
									</p>
								</div>

								{/* RIGHT — decorative clip collage */}
								<ClipsCollage />
							</div>

						</>
					)}
				</div>
			</div>
			{/* mode tabs: docked bottom bar below the main content */}
			<EditorModeTabs projectId={projectId} mode="clips" className="shrink-0 overflow-hidden rounded-lg border border-border" />
		</div>
	);
}


// Looping hero animation lives in the shared component (also used on the
// marketing site); here we just wrap it with the clips-screen heading.
function ClipsCollage() {
	return (
		<div className="relative hidden min-h-[560px] flex-col items-center justify-start pt-16 lg:flex">
			<div className="mb-9 max-w-sm text-center">
				<p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-300/80">
					AI Clips
				</p>
				<h2 className="mt-1.5 text-2xl font-bold tracking-tight">
					1 long video → <span className="text-teal-300">10 viral clips</span>
				</h2>
				<p className="mt-2.5 text-sm text-muted-foreground">
					AI hunts down every hook, highlight, and punchline — then cuts them
					into captioned shorts, ready to post.
				</p>
			</div>
			<ClipsFanAnimation />
		</div>
	);
}


// Subtitle-style picker: a horizontal scroller with floating arrows that appear
// only when there is more to scroll in that direction.
function SubtitleStyleRow({ value, onSelect }: { value: string; onSelect: (id: string) => void }) {
	const ref = useRef<HTMLDivElement>(null);
	const [canL, setCanL] = useState(false);
	const [canR, setCanR] = useState(false);
	const update = useCallback(() => {
		const el = ref.current;
		if (!el) return;
		setCanL(el.scrollLeft > 4);
		setCanR(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
	}, []);
	useEffect(() => {
		update();
		const el = ref.current;
		if (!el) return;
		el.addEventListener("scroll", update, { passive: true });
		window.addEventListener("resize", update);
		return () => {
			el.removeEventListener("scroll", update);
			window.removeEventListener("resize", update);
		};
	}, [update]);
	const go = (dir: number) => ref.current?.scrollBy({ left: dir * 220, behavior: "smooth" });
	const arrow =
		"absolute top-[44px] z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-[#1e2129] text-foreground shadow-xl shadow-black/40 backdrop-blur-sm transition-colors hover:border-white/25 hover:bg-[#262a34]";
	return (
		<div className="relative">
			<div
				ref={ref}
				className="-mx-1 flex shrink-0 gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
			>
				{PRESET_META.map((preset) => {
					const active = value === preset.id;
					return (
						<button key={preset.id} type="button" onClick={() => onSelect(preset.id)} className="group shrink-0 text-center">
							<div
								className={cn(
									"grid h-[88px] w-[124px] place-items-center overflow-hidden rounded-xl border-2 bg-gradient-to-b from-[#1c2029] to-[#12151b] p-2 transition-colors",
									active ? "border-teal-400" : "border-white/10 group-hover:border-white/25",
								)}
							>
								<CaptionSample css={captionCss(preset.id, null, 1.05)} text="Hey there," />
							</div>
							<span className={cn("mt-1.5 block text-xs font-medium transition-colors", active ? "text-teal-300" : "text-muted-foreground group-hover:text-foreground")}>
								{preset.name}
							</span>
						</button>
					);
				})}
			</div>
			{canL ? (
				<button type="button" aria-label="Scroll left" onClick={() => go(-1)} className={cn(arrow, "left-0")}>
					<ChevronLeft className="size-5" />
				</button>
			) : null}
			{canR ? (
				<button type="button" aria-label="Scroll right" onClick={() => go(1)} className={cn(arrow, "-right-1.5")}>
					<ChevronRight className="size-5" />
				</button>
			) : null}
		</div>
	);
}

// Themed dropdown (never the native <select>) — matches the dark field style.
function ThemedSelect({
	value,
	options,
	onChange,
	onLocked,
}: {
	value: string;
	options: { value: string; label: string; locked?: boolean }[];
	onChange: (v: string) => void;
	onLocked?: () => void;
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
	const current = options.find((o) => o.value === value);
	return (
		<div ref={ref} className="relative">
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				className={cn(
					"flex h-11 w-full items-center justify-between rounded-lg border bg-white/[0.03] px-3.5 text-sm text-foreground transition-colors",
					open ? "border-teal-400/60" : "border-white/10 hover:border-white/20",
				)}
			>
				<span>{current?.label ?? value}</span>
				<ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
			</button>
			{open ? (
				<div className="absolute inset-x-0 top-full z-30 mt-1.5 rounded-lg border border-white/10 bg-[#1e2129] p-1 shadow-2xl backdrop-blur-sm animate-in fade-in-0 zoom-in-95 duration-100">
					{options.map((o) => {
						const active = o.value === value;
						return (
							<button
								key={o.value}
								type="button"
								onClick={() => {
									if (o.locked) {
										onLocked?.();
										setOpen(false);
										return;
									}
									onChange(o.value);
									setOpen(false);
								}}
								className={cn(
									"flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
									o.locked
										? "cursor-not-allowed text-muted-foreground/60"
										: active
											? "bg-teal-400/10 text-teal-300"
											: "text-foreground/90 hover:bg-white/5",
								)}
							>
								{o.label}
								{o.locked ? (
									<span className="flex items-center gap-1 rounded-md bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
										<Gem className="size-3" /> Pro
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

// Step 2: configure the job (OpusClip-style) before it starts.
function ConfigPanel({
	meta,
	preview,
	title,
	params,
	setParams,
	busy,
	error,
	onStart,
	onBack,
}: {
	meta: SourceMeta | null;
	preview?: string;
	title: string;
	params: ClipsParams;
	setParams: React.Dispatch<React.SetStateAction<ClipsParams>>;
	busy: string | null;
	error: string | null;
	onStart: () => void;
	onBack: () => void;
}) {
	const [scheduleOpen, setScheduleOpen] = useState(false);
	const [cost, setCost] = useState<number | null>(null);
	const { data: balance } = useBalance();

	const [accounts, setAccounts] = useState<SocialAccount[] | null>(null);
	const [providers, setProviders] = useState<Record<string, boolean> | null>(
		null,
	);
	const [showConnect, setShowConnect] = useState(false);
	const connectRef = useRef<HTMLDivElement>(null);

	const loadAccounts = useCallback(() => {
		listSocialAccounts().then(setAccounts).catch(() => setAccounts([]));
	}, []);

	useEffect(() => {
		loadAccounts();
		socialProviders().then(setProviders).catch(() => setProviders({}));
	}, [loadAccounts]);

	useEffect(() => {
		const onMsg = (e: MessageEvent) => {
			if (e.data === "riocut:social-connected") {
				loadAccounts();
				setShowConnect(false);
			}
		};
		window.addEventListener("message", onMsg);
		return () => window.removeEventListener("message", onMsg);
	}, [loadAccounts]);

	useEffect(() => {
		if (!showConnect) return;
		const onDown = (e: MouseEvent) => {
			if (!connectRef.current?.contains(e.target as Node))
				setShowConnect(false);
		};
		document.addEventListener("mousedown", onDown);
		return () => document.removeEventListener("mousedown", onDown);
	}, [showConnect]);

	const connect = (provider: string) =>
		socialConnectUrl(provider)
			.then(({ url }) =>
				window.open(url, "riocut-connect", "width=640,height=760"),
			)
			.catch(() => {});

	const toggleAccount = (id: string) => {
		setParams((p) => {
			const current = p.schedule?.account_ids ?? [];
			const next = current.includes(id)
				? current.filter((a) => a !== id)
				: [...current, id];
			return {
				...p,
				schedule: {
					...(p.schedule ?? defaultSchedule()),
					enabled: true,
					account_ids: next,
				},
			};
		});
	};

	useEffect(() => {
		estimateClipsCost(params.count, meta?.duration)
			.then(({ credits }) => setCost(credits))
			.catch(() => setCost(null));
	}, [params.count, meta?.duration]);
	const insufficient =
		cost !== null && balance !== undefined && balance.balance < cost;
	const isFree = (balance?.plan ?? "free") === "free";
	// Free: watermark always on (removal is a paid upsell). Paid: user's choice, default removed.
	const watermarkRemoved = !isFree && (params.remove_watermark ?? true);
	const [goal, setGoal] = useState("Viral Short");
	const [maxLen, setMaxLen] = useState<string>("auto");
	const [customSec, setCustomSec] = useState<number>(120);
	// Advanced/rarely-used field — collapsed unless a draft already filled it in.
	const [showFocus, setShowFocus] = useState<boolean>(Boolean(params.focus));

	const scheduleOn = params.schedule?.enabled ?? false;
	const pickedAccounts = params.schedule?.account_ids ?? [];
	const setScheduleOn = (on: boolean) =>
		setParams((p) => ({
			...p,
			schedule: { ...(p.schedule ?? defaultSchedule()), enabled: on },
		}));

	// Which duration bands allow clips up to `sec` long (band lower-bound < sec).
	const bandsForMax = (sec: number) =>
		([["lt30", 0], ["30-60", 30], ["60-90", 60], ["90-180", 90], ["gt180", 180]] as const)
			.filter(([, lo]) => lo < sec)
			.map(([k]) => k);
	const LEN_OPTS: { k: string; label: string; dur: "auto" | string[] }[] = [
		{ k: "auto", label: "Auto", dur: "auto" },
		{ k: "30", label: "30s", dur: bandsForMax(30) },
		{ k: "60", label: "60s", dur: bandsForMax(60) },
		{ k: "90", label: "90s", dur: bandsForMax(90) },
		{ k: "180", label: "3 min", dur: bandsForMax(180) },
	];
	const GOALS = ["Viral Short", "Highlights", "Insights"];
	const labelCls = "mt-6 mb-2 block text-sm font-semibold";
	const pillCls = (active: boolean) =>
		cn(
			"rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
			active ? "border-teal-400 bg-teal-400/10 text-teal-300" : "border-white/12 text-muted-foreground hover:bg-white/5",
		);

	return (
		<div className="grid min-h-0 flex-1 items-stretch gap-6 lg:grid-cols-[minmax(0,460px)_1fr]">
			{/* LEFT — options */}
			<div className="relative flex min-h-0 flex-col overflow-y-auto rounded-lg border border-border bg-card p-7 shadow-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
				<div className="flex items-start justify-between">
					<h1 className="text-2xl font-extrabold uppercase tracking-tight">Customize Clips</h1>
					<div className="mt-2 flex items-center gap-1.5">
						<span className="size-2 rounded-full bg-white/15" />
						<span className="size-2 rounded-full bg-[#14b8a6]" />
					</div>
				</div>
				<p className="mt-1.5 text-sm text-muted-foreground">
					Choose your caption style and clip length while your video is processed.
				</p>

				{/* Source preview — the actual uploaded file (plays) or the link's poster. */}
				{preview || meta?.thumbnail ? (
					<div className="mt-5 flex items-center gap-3 rounded-lg border border-white/10 bg-[#151821] p-2.5">
						<div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-md bg-black">
							{preview ? (
								<video src={preview} className="size-full object-cover" muted loop autoPlay playsInline />
							) : (
								// biome-ignore lint/a11y/useAltText: decorative source poster
								<img src={meta?.thumbnail ?? ""} className="size-full object-cover" alt="" />
							)}
						</div>
						<div className="min-w-0">
							<p className="truncate text-sm font-semibold">{meta?.title ?? title ?? "Your video"}</p>
							{meta?.duration ? (
								<p className="text-xs text-muted-foreground">
									{Math.floor(meta.duration / 60)}m {Math.round(meta.duration % 60)}s
								</p>
							) : null}
						</div>
					</div>
				) : null}

				<span className={labelCls}>Size</span>
				<ThemedSelect
					value={params.ratio}
					onChange={(v) => setParams((p) => ({ ...p, ratio: v as ClipsParams["ratio"] }))}
					onLocked={() => openUpgrade("Unlock more aspect ratios")}
					options={[
						{ value: "9:16", label: "Portrait (9:16)" },
						{ value: "1:1", label: "Square (1:1)", locked: isFree },
						{ value: "16:9", label: "Landscape (16:9)", locked: isFree },
					]}
				/>

				<span className={labelCls}>Video Goals</span>
				<div className="flex flex-wrap gap-2">
					{GOALS.map((g) => (
						<button key={g} type="button" onClick={() => setGoal(g)} className={pillCls(goal === g)}>
							{g}
						</button>
					))}
				</div>

				<button
					type="button"
					onClick={() => setShowFocus((s) => !s)}
					className={cn(labelCls, "flex w-full items-center justify-between text-left")}
				>
					<span>
						Describe what clips should capture{" "}
						<span className="font-normal text-muted-foreground">(optional)</span>
					</span>
					{showFocus ? (
						<ChevronDown className="size-4 shrink-0 text-muted-foreground" />
					) : (
						<Plus className="size-4 shrink-0 text-muted-foreground" />
					)}
				</button>
				{showFocus ? (
					<div className="relative">
						<textarea
							value={params.focus ?? ""}
							onChange={(e) => setParams((p) => ({ ...p, focus: e.target.value.slice(0, 5000) }))}
							placeholder="Let us know if there are any parts of the video you'd like us to extract"
							className="min-h-28 w-full resize-none rounded-lg border border-white/10 bg-white/[0.03] p-3.5 pb-8 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-teal-400/60 focus:bg-white/[0.05]"
						/>
						<span className="pointer-events-none absolute right-3 bottom-2.5 text-xs text-muted-foreground/60">
							{(params.focus ?? "").length}/5000
						</span>
					</div>
				) : null}

				<span className={labelCls}>Subtitle Style</span>
				<SubtitleStyleRow
					value={params.caption_style}
					onSelect={(id) => setParams((p) => ({ ...p, caption_style: id, captions: true }))}
				/>

				<span className={labelCls}>Max clip length</span>
				<div className="flex flex-wrap gap-2">
					{LEN_OPTS.map((o) => (
						<button
							key={o.k}
							type="button"
							onClick={() => {
								setMaxLen(o.k);
								setParams((p) => ({ ...p, duration: o.dur }));
							}}
							className={pillCls(maxLen === o.k)}
						>
							{o.label}
						</button>
					))}
					<button
						type="button"
						onClick={() => {
							setMaxLen("custom");
							setParams((p) => ({ ...p, duration: bandsForMax(customSec) }));
						}}
						className={pillCls(maxLen === "custom")}
					>
						Custom
					</button>
				</div>
				{maxLen === "custom" ? (
					<div className="mt-2.5 flex items-center gap-2">
						<input
							type="number"
							min={5}
							max={3600}
							value={customSec}
							onChange={(e) => {
								const sec = Math.max(5, Math.min(3600, Number(e.target.value) || 0));
								setCustomSec(sec);
								setParams((p) => ({ ...p, duration: bandsForMax(sec) }));
							}}
							className="h-11 w-28 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 text-sm outline-none transition-colors focus:border-teal-400/60 focus:bg-white/[0.05]"
						/>
						<span className="text-sm text-muted-foreground">
							seconds max{customSec >= 60 ? ` · ${(customSec / 60).toFixed(customSec % 60 ? 1 : 0)} min` : ""}
						</span>
					</div>
				) : null}

					{/* Video title — one title burned on every clip; empty = AI writes one per clip */}
					<div className="mt-6">
						<div className="flex items-center justify-between gap-4">
							<div className="min-w-0">
								<p className="text-sm font-medium text-foreground">Video title</p>
							</div>
							<button
								type="button"
								role="switch"
								aria-checked={params.headline?.enabled ?? false}
								aria-label="Show a title on clips"
								onClick={() =>
								setParams((pr) => ({
									...pr,
									headline: { bg: "none", color: "#ffffff", ...(pr.headline ?? {}), enabled: !(pr.headline?.enabled ?? false) },
								}))
							}
								className={cn(
									"relative h-5 w-9 shrink-0 rounded-full transition-colors",
									(params.headline?.enabled ?? false) ? "bg-teal-500" : "bg-white/10",
								)}
							>
								<span
									className={cn(
										"absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform",
										(params.headline?.enabled ?? false) && "translate-x-4",
									)}
								/>
							</button>
						</div>
						{params.headline?.enabled ? (
							<input
								value={params.headline?.text ?? ""}
								onChange={(e) =>
									setParams((pr) => ({
										...pr,
										headline: { bg: "none", color: "#ffffff", enabled: true, ...(pr.headline ?? {}), text: e.target.value },
									}))
								}
								placeholder="Auto-generated by AI if left empty"
								className="mt-3 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-teal-400/60 focus:bg-white/[0.05]"
							/>
						) : null}
					</div>

					{/* Remove watermark — free clips carry a riocut.com mark; removing it is a paid perk */}
					<div className="mt-5">
						<div className="flex items-center justify-between gap-4">
							<div className="min-w-0">
								<p className="flex items-center gap-2 text-sm font-medium text-foreground">
								Remove watermark
								{isFree ? (
									<span className="flex items-center gap-0.5 rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
										<Gem className="size-2.5" /> Pro
									</span>
								) : null}
							</p>
							</div>
							<button
								type="button"
								role="switch"
								aria-checked={watermarkRemoved}
								aria-label="Remove watermark"
								onClick={() => {
									if (isFree) openUpgrade("Remove the watermark");
									else setParams((p) => ({ ...p, remove_watermark: !(p.remove_watermark ?? true) }));
								}}
								className={cn(
									"relative h-5 w-9 shrink-0 rounded-full transition-colors",
									watermarkRemoved ? "bg-teal-500" : "bg-white/10",
								)}
							>
								<span
									className={cn(
										"absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform",
										watermarkRemoved && "translate-x-4",
									)}
								/>
							</button>
						</div>
					</div>

					{/* Auto-publish schedule — post finished clips to connected socials. */}
					<div className="mt-5">
						<div className="flex items-center justify-between gap-4">
							<div className="min-w-0">
								<p className="text-sm font-medium text-foreground">Auto-publish schedule</p>
							</div>
							<button
								type="button"
								role="switch"
								aria-checked={scheduleOn}
								onClick={() => setScheduleOn(!scheduleOn)}
								className={cn(
									"relative h-5 w-9 shrink-0 rounded-full transition-colors",
									scheduleOn ? "bg-teal-500" : "bg-white/10",
								)}
							>
								<span
									className={cn(
										"absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform",
										scheduleOn && "translate-x-4",
									)}
								/>
							</button>
						</div>

					{scheduleOn ? (
						<div className="mt-4">
							<p className="mb-2 text-xs font-medium text-muted-foreground">Post to</p>
							<div className="flex flex-wrap gap-2">
								{(accounts ?? []).map((a) => {
									const plat = SOCIAL_PLATFORMS.find((p) => p.key === a.platform);
									const on = pickedAccounts.includes(a.id);
									return (
										<button
											key={a.id}
											type="button"
											onClick={() => toggleAccount(a.id)}
											className={cn(
												"flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors",
												on
													? "border-teal-400 bg-teal-400/10 text-teal-200"
													: "border-white/12 text-muted-foreground hover:bg-white/5",
											)}
										>
											{plat ? <plat.icon className="size-4" /> : null}
											<span className="max-w-[120px] truncate">{a.username ?? plat?.name ?? a.platform}</span>
											{on ? <Check className="size-3.5" /> : null}
										</button>
									);
								})}

								{/* Add / connect a new account */}
								<div ref={connectRef} className="relative">
									<button
										type="button"
										onClick={() => setShowConnect((s) => !s)}
										className="flex items-center gap-1.5 rounded-lg border border-dashed border-white/20 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-white/5"
									>
										<Plus className="size-4" /> Add connection
									</button>
									{showConnect ? (
										<div className="absolute bottom-full left-0 z-20 mb-2 w-56 rounded-xl border border-border bg-popover p-1.5 shadow-xl">
											{SOCIAL_PLATFORMS.map((p) => (
												<button
													key={p.key}
													type="button"
													onClick={() => connect(p.provider)}
													className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-white/5"
												>
													<span className={cn("grid size-6 place-items-center rounded-md", p.bg)}>
														<p.icon className="size-3.5" />
													</span>
													<span className="flex-1 text-left">{p.name}</span>
													{providers?.[p.provider] ? (
														<Check className="size-3.5 text-teal-300" />
													) : (
														<ExternalLink className="size-3.5 text-muted-foreground" />
													)}
												</button>
											))}
										</div>
									) : null}
								</div>
							</div>

							{(accounts?.length ?? 0) === 0 ? (
								<p className="mt-2 text-xs text-muted-foreground">
									No accounts connected yet — add one to auto-publish.
								</p>
							) : null}

							<button
								type="button"
								onClick={() => setScheduleOpen(true)}
								className="mt-3 text-xs font-medium text-teal-300 hover:underline"
							>
								Cadence &amp; timing settings →
							</button>
						</div>
					) : null}
				</div>

				{scheduleOpen ? (
					<ScheduleModal
						value={params.schedule ?? defaultSchedule()}
						onSave={(cfg) => {
							setParams((p) => ({ ...p, schedule: cfg }));
							setScheduleOpen(false);
						}}
						onClose={() => setScheduleOpen(false)}
					/>
				) : null}

				{error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

				<div className="mt-auto flex gap-3 pt-6">
					<button
						type="button"
						onClick={onBack}
						disabled={busy !== null}
						className="rounded-lg border border-white/12 px-5 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-white/5 disabled:opacity-50"
					>
						Back
					</button>
					{insufficient && !busy ? (
						// Out of credits → premium upgrade CTA instead of a dead button.
						<button
							type="button"
							onClick={() => openUpgrade("You're out of credits")}
							className="group relative flex flex-1 items-center gap-2 overflow-hidden rounded-lg bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200 py-2.5 pr-2 pl-5 text-sm font-bold text-black shadow-lg shadow-amber-500/25 transition-shadow hover:shadow-xl hover:shadow-amber-500/40"
						>
							{/* sheen sweep on hover */}
							<span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
							<Gem className="size-4" />
							<span className="flex-1 text-left">
								Upgrade to get credits
								{cost !== null ? (
									<span className="block text-[11px] font-semibold text-black/60">
										Needs {cost} credits · you have {balance?.balance ?? 0}
									</span>
								) : null}
							</span>
							<span className="flex items-center gap-1 rounded-md bg-black/15 px-2 py-1 text-xs font-bold">
								Pro <ArrowRight className="size-3.5" />
							</span>
						</button>
					) : (
						<button
							type="button"
							onClick={onStart}
							disabled={busy !== null}
							className="group flex flex-1 items-center gap-2 rounded-lg bg-[#14b8a6] py-2.5 pr-2 pl-5 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 transition-colors hover:bg-[#0f9c8c] disabled:opacity-60"
						>
							{busy ? (
								<span className="flex flex-1 items-center justify-center gap-2">
									<Loader2 className="size-4 animate-spin" /> {busy}
								</span>
							) : (
								<>
									<Sparkles className="size-4" />
									<span className="flex-1 text-left">Generate clips</span>
									{cost !== null ? (
										<span className="flex items-center gap-1 rounded-md bg-black/20 px-2 py-1 text-xs font-bold tabular-nums">
											<Gem className="size-3.5 text-teal-200" /> {cost}
										</span>
									) : null}
								</>
							)}
						</button>
					)}
				</div>
			</div>

			{/* RIGHT — live preview */}
			<div className="hidden place-items-center lg:grid">
				<div className="relative aspect-[9/16] w-[400px] max-w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl shadow-black/50">
					{/* Sample preview clip (not the user's upload) so the caption style is easy to judge. */}
					<video src={PREVIEW_VIDEO} className="size-full object-cover" autoPlay muted loop playsInline />
					<div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
						{/* WYSIWYG of the burned watermark (bottom-right riocut.com) */}
						{!watermarkRemoved ? (
							<span className="pointer-events-none absolute right-3 bottom-3 text-sm font-semibold text-white/55 drop-shadow">
								riocut.com
							</span>
						) : null}
					<span className="absolute top-3 left-3 rounded-md bg-black/55 px-2 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
						PREVIEW
					</span>
					{/* Live title — typed wins; empty shows the AI-generated placeholder */}
						{params.headline?.enabled ? (
							<div className="absolute inset-x-0 top-12 flex justify-center px-4">
								<span
									className={cn(
										"max-w-full text-center text-lg font-extrabold uppercase leading-tight [text-shadow:0_2px_4px_rgba(0,0,0,0.9)]",
										params.headline.text?.trim() ? "text-white" : "text-white/60 italic",
									)}
								>
									{params.headline.text?.trim() || "AI-generated title"}
								</span>
							</div>
						) : null}
						<div className="absolute inset-x-0 bottom-10 flex justify-center px-4">
						<span className="text-2xl leading-tight font-bold">
							<CaptionSample css={captionCss(params.caption_style, params.caption_custom ?? null, 1.6)} text="Hey there," />
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}

