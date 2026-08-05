"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ArrowLeft,
	CalendarClock,
	Check,
	ChevronRight,
	Copy,
	Download,
	ExternalLink,
	Link2,
	Loader2,
	type LucideIcon,
	MessageSquareText,
	MoreHorizontal,
	Plus,
	Presentation,
	Send,
	Trash2,
	X,
} from "lucide-react";
import {
	type ComponentType,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/shared/components/select";
import {
	listSchedule,
	listSocialAccounts,
	type PublishResult,
	socialConnectUrl,
	socialProviders,
	tiktokCreatorInfo,
} from "@/features/clips/api";
import {
	publishEditorProject,
	renderEditorProject,
	shareEditorProject,
} from "../services/video-editor-api";
import { buildCaptions } from "../lib/captions";
import type { VideoEditorDoc } from "../types";

const TERMINAL = new Set(["posted", "failed"]);
const PRIVACY_LABEL: Record<string, string> = {
	PUBLIC_TO_EVERYONE: "Public",
	MUTUAL_FOLLOW_FRIENDS: "Friends",
	FOLLOWER_OF_CREATOR: "Followers",
	SELF_ONLY: "Private (only me)",
};

interface ExportPanelProps {
	projectId: string;
	title: string;
	doc: VideoEditorDoc;
	share: { review: string | null; presentation: string | null };
	saveFirst: () => Promise<void>;
	onClose: () => void;
}

// ── brand glyphs (lucide has no brand icons) ────────────────────────────────
type IconProps = { className?: string };
const YouTubeIcon = (p: IconProps) => (
	<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
		<path d="M8 5.14v13.72L19 12 8 5.14z" />
	</svg>
);
const TikTokIcon = (p: IconProps) => (
	<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
		<path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.3 0 .6.05.88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z" />
	</svg>
);
const FacebookIcon = (p: IconProps) => (
	<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
		<path d="M13.4 21v-8.1h2.72l.4-3.16H13.4V7.72c0-.91.25-1.53 1.56-1.53h1.67V3.36c-.29-.04-1.28-.13-2.43-.13-2.4 0-4.05 1.47-4.05 4.16v2.32H7.43v3.16h2.72V21h3.25z" />
	</svg>
);
const InstagramIcon = (p: IconProps) => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		aria-hidden
		{...p}
	>
		<rect x="3" y="3" width="18" height="18" rx="5" />
		<circle cx="12" cy="12" r="4" />
		<circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
	</svg>
);
const XIcon = (p: IconProps) => (
	<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
		<path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.46l8.6-9.83L0 1.15h7.59l5.24 6.93zm-1.29 19.5h2.04L6.49 3.24H4.3z" />
	</svg>
);
const LinkedInIcon = (p: IconProps) => (
	<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
		<path d="M4.98 3.5A2.5 2.5 0 1 1 0 3.5a2.5 2.5 0 0 1 4.98 0zM.5 8h4V24h-4V8zM8 8h3.83v2.2h.05c.53-1 1.84-2.2 3.79-2.2 4.05 0 4.8 2.67 4.8 6.14V24h-4v-6.85c0-1.63-.03-3.73-2.27-3.73-2.28 0-2.63 1.78-2.63 3.62V24H8V8z" />
	</svg>
);

const PLATFORM: Record<
	string,
	{ name: string; icon: ComponentType<IconProps>; bg: string }
> = {
	youtube: { name: "YouTube", icon: YouTubeIcon, bg: "bg-[#FF0000]" },
	tiktok: { name: "TikTok", icon: TikTokIcon, bg: "bg-black" },
	instagram: {
		name: "Instagram",
		icon: InstagramIcon,
		bg: "bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]",
	},
	facebook: { name: "Facebook", icon: FacebookIcon, bg: "bg-[#1877F2]" },
	x: { name: "X (Twitter)", icon: XIcon, bg: "bg-black" },
	linkedin: { name: "LinkedIn", icon: LinkedInIcon, bg: "bg-[#0A66C2]" },
};

export function ExportPanel({
	projectId,
	title: initialTitle,
	doc,
	share: initialShare,
	saveFirst,
	onClose,
}: ExportPanelProps) {
	const qc = useQueryClient();
	const [view, setView] = useState<"menu" | "publish" | "share">("menu");

	// render state
	const [rendering, setRendering] = useState(false);
	const [renderRes, setRenderRes] = useState<{
		key: string;
		url: string;
		kind: string;
		duration: number;
	} | null>(null);

	// publish form state
	const [selectedAccs, setSelectedAccs] = useState<Set<string>>(new Set());
	const [postTitle, setPostTitle] = useState(initialTitle);
	const [postCaption, setPostCaption] = useState("");
	const [tiktokPrivacy, setTiktokPrivacy] = useState("PUBLIC_TO_EVERYONE");
	const [publishing, setPublishing] = useState(false);
	const [publishResults, setPublishResults] = useState<PublishResult[] | null>(
		null,
	);
	const [publishError, setPublishError] = useState<string | null>(null);

	// share links state
	const [shareTokens, setShareTokens] = useState<{
		review: string | null;
		presentation: string | null;
	}>({
		review: initialShare.review ?? null,
		presentation: initialShare.presentation ?? null,
	});
	const [sharingMode, setSharingMode] = useState<
		"review" | "presentation" | null
	>(null);

	// social accounts + tiktok privacy options
	const { data: socialAccs = [] } = useQuery({
		queryKey: ["social-accounts"],
		queryFn: listSocialAccounts,
	});

	const tiktokAcc = socialAccs.find((a) => a.provider === "tiktok");
	const { data: ttInfo } = useQuery({
		queryKey: ["tiktok-creator-info", tiktokAcc?.id],
		queryFn: () => tiktokCreatorInfo(tiktokAcc!.id),
		enabled: !!tiktokAcc && selectedAccs.has(tiktokAcc.id),
	});

	// Poll publish results until terminal
	const hasPending =
		publishResults?.some((r) => !TERMINAL.has(r.status)) ?? false;
	useQuery({
		queryKey: ["editor-publish-status", projectId],
		queryFn: async () => {
			const res = await listSchedule();
			setPublishResults((prev) => {
				if (!prev) return prev;
				const map = new Map(res.map((item) => [item.id, item]));
				return prev.map((item) => map.get(item.id) ?? item);
			});
			return res;
		},
		enabled: hasPending,
		refetchInterval: 2000,
	});

	// Fire an ffmpeg render job (or reuse the active one)
	const triggerRender = useCallback(async () => {
		if (renderRes || rendering) return renderRes;
		setRendering(true);
		try {
			await saveFirst();
			const res = await renderEditorProject(projectId, { format: "mp4" });
			setRenderRes(res);
			return res;
		} finally {
			setRendering(false);
		}
	}, [projectId, renderRes, rendering, saveFirst]);

	// Auto-start render when switching into Publish view
	useEffect(() => {
		if (view === "publish" && !renderRes && !rendering) {
			void triggerRender();
		}
	}, [view, renderRes, rendering, triggerRender]);

	// Toggle account selection
	const toggleAcc = (id: string) => {
		setSelectedAccs((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	// Execute post creation
	const handlePublish = async () => {
		setPublishError(null);
		let key = renderRes?.key;
		if (!key) {
			const r = await triggerRender();
			key = r?.key;
		}
		if (!key) {
			setPublishError("Render failed — cannot publish.");
			return;
		}
		if (selectedAccs.size === 0) {
			setPublishError("Select at least one social account.");
			return;
		}
		setPublishing(true);
		try {
			const res = await publishEditorProject(projectId, {
				render_key: key,
				account_ids: Array.from(selectedAccs),
				title: postTitle,
				caption: postCaption,
				tiktok_privacy: tiktokPrivacy,
			});
			setPublishResults(res);
			qc.invalidateQueries({ queryKey: ["schedule"] });
		} catch (e) {
			setPublishError(
				e instanceof Error ? e.message : "Failed to trigger publish",
			);
		} finally {
			setPublishing(false);
		}
	};

	// Toggle share link (create or revoke)
	const toggleShare = async (mode: "review" | "presentation") => {
		const active = !!shareTokens[mode];
		setSharingMode(mode);
		try {
			await saveFirst();
			const res = await shareEditorProject(projectId, mode, active);
			setShareTokens((prev) => ({ ...prev, [mode]: res.token }));
			qc.invalidateQueries({ queryKey: ["editor-project", projectId] });
		} finally {
			setSharingMode(null);
		}
	};

	// Download raw subtitle file (SRT / VTT)
	const downloadSubtitle = (format: "srt" | "vtt") => {
		const text = buildCaptions(doc, format);
		if (!text) return;
		const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${initialTitle.replace(/\s+/g, "_")}.${format}`;
		a.click();
		URL.revokeObjectURL(url);
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
			<div className="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
				{/* header */}
				<div className="flex items-center justify-between border-b border-border px-5 py-4">
					<div className="flex items-center gap-2">
						{view !== "menu" ? (
							<button
								type="button"
								onClick={() => setView("menu")}
								className="grid size-8 place-items-center rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"
							>
								<ArrowLeft className="size-4" />
							</button>
						) : null}
						<h2 className="text-lg font-bold">
							{view === "menu"
								? "Export & Share"
								: view === "publish"
									? "Publish to Social Media"
									: "Shareable Preview Links"}
						</h2>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="grid size-8 place-items-center rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"
					>
						<X className="size-4" />
					</button>
				</div>

				{/* content */}
				<div className="flex-1 overflow-y-auto p-5 [scrollbar-width:thin]">
					{view === "menu" ? (
						<div className="space-y-6">
							{/* Primary Option: Direct Render Download */}
							<div className="rounded-xl border border-teal-500/30 bg-teal-500/5 p-4 space-y-3">
								<div className="flex items-start gap-3">
									<div className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#14b8a6] text-black">
										<Download className="size-5" />
									</div>
									<div className="space-y-1">
										<h3 className="font-semibold text-sm">Download Rendered MP4</h3>
										<p className="text-xs text-muted-foreground">
											Compile timeline with all tracks, effects, and captions burned in.
										</p>
									</div>
								</div>

								{renderRes ? (
									<div className="flex items-center justify-between gap-3 pt-2">
										<span className="text-xs text-teal-400 font-medium flex items-center gap-1.5">
											<Check className="size-4" /> Render complete ({renderRes.duration.toFixed(1)}s)
										</span>
										<a
											href={renderRes.url}
											download={`${initialTitle}.mp4`}
											className="flex items-center gap-1.5 rounded-lg bg-[#14b8a6] px-3 py-1.5 text-xs font-semibold text-black transition-opacity hover:opacity-90"
										>
											<Download className="size-3.5" /> Save File
										</a>
									</div>
								) : (
									<button
										type="button"
										onClick={() => void triggerRender()}
										disabled={rendering}
										className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#14b8a6] py-2 text-xs font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
									>
										{rendering ? (
											<>
												<Loader2 className="size-3.5 animate-spin" /> Compiling FFmpeg Filtergraph…
											</>
										) : (
											<>
												<Download className="size-3.5" /> Start Export Render
											</>
										)}
									</button>
								)}
							</div>

							{/* Secondary Actions */}
							<div className="grid grid-cols-2 gap-3">
								<button
									type="button"
									onClick={() => setView("publish")}
									className="flex flex-col items-start gap-2 rounded-xl border border-border p-4 text-left transition-colors hover:border-teal-500/50 hover:bg-accent"
								>
									<Send className="size-5 text-[#14b8a6]" />
									<div>
										<span className="block text-sm font-semibold">Publish & Schedule</span>
										<span className="block text-[11px] text-muted-foreground">
											Direct post to TikTok, YouTube, Reels
										</span>
									</div>
								</button>

								<button
									type="button"
									onClick={() => setView("share")}
									className="flex flex-col items-start gap-2 rounded-xl border border-border p-4 text-left transition-colors hover:border-teal-500/50 hover:bg-accent"
								>
									<Link2 className="size-5 text-[#14b8a6]" />
									<div>
										<span className="block text-sm font-semibold">Review Links</span>
										<span className="block text-[11px] text-muted-foreground">
											Share with clients for frame feedback
										</span>
									</div>
								</button>
							</div>

							{/* Subtitles / Captions Download */}
							<div className="space-y-2 border-t border-border pt-4">
								<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
									Captions & Subtitles
								</p>
								<div className="flex gap-2">
									<button
										type="button"
										onClick={() => downloadSubtitle("srt")}
										className="flex-1 rounded-lg border border-border py-2 text-xs font-medium transition-colors hover:bg-accent"
									>
										Download SRT
									</button>
									<button
										type="button"
										onClick={() => downloadSubtitle("vtt")}
										className="flex-1 rounded-lg border border-border py-2 text-xs font-medium transition-colors hover:bg-accent"
									>
										Download VTT
									</button>
								</div>
							</div>
						</div>
					) : view === "publish" ? (
						/* PUBLISH VIEW */
						<div className="space-y-5">
							{/* Accounts checklist */}
							<div className="space-y-2">
								<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
									Target Accounts
								</label>
								{socialAccs.length === 0 ? (
									<div className="rounded-xl border border-border p-4 text-center space-y-2">
										<p className="text-xs text-muted-foreground">No social accounts connected.</p>
										<a
											href="/settings/socials"
											className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#14b8a6] hover:underline"
										>
											<Plus className="size-3.5" /> Connect Social Account
										</a>
									</div>
								) : (
									<div className="grid grid-cols-2 gap-2">
										{socialAccs.map((acc) => {
											const plat = PLATFORM[acc.provider];
											const Icon = plat?.icon ?? GlobeIcon;
											const active = selectedAccs.has(acc.id);
											return (
												<button
													key={acc.id}
													type="button"
													onClick={() => toggleAcc(acc.id)}
													className={cn(
														"flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors",
														active
															? "border-[#14b8a6] bg-[#14b8a6]/10"
															: "border-border hover:bg-accent",
													)}
												>
													<span
														className={cn(
															"grid size-7 place-items-center rounded-lg text-white shrink-0",
															plat?.bg ?? "bg-primary",
														)}
													>
														<Icon className="size-4" />
													</span>
													<div className="min-w-0 flex-1">
														<span className="block truncate text-xs font-semibold">
															{acc.username || acc.name}
														</span>
														<span className="block truncate text-[10px] text-muted-foreground capitalize">
															{plat?.name ?? acc.provider}
														</span>
													</div>
													<Checkbox checked={active} className="pointer-events-none" />
												</button>
											);
										})}
									</div>
								)}
							</div>

							{/* Post Fields */}
							<div className="space-y-3">
								<div className="space-y-1">
									<label className="text-xs font-medium">Post Title</label>
									<input
										type="text"
										value={postTitle}
										onChange={(e) => setPostTitle(e.target.value)}
										className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-[#14b8a6]"
									/>
								</div>

								<div className="space-y-1">
									<label className="text-xs font-medium">Caption / Description</label>
									<textarea
										value={postCaption}
										onChange={(e) => setPostCaption(e.target.value)}
										rows={3}
										placeholder="Add hashtags & details…"
										className="w-full resize-none rounded-lg border border-border bg-transparent p-3 text-sm outline-none focus:border-[#14b8a6]"
									/>
								</div>

								{/* TikTok privacy option */}
								{selectedAccs.has(tiktokAcc?.id ?? "") ? (
									<div className="space-y-1">
										<label className="text-xs font-medium">TikTok Audience</label>
										<Select
											value={tiktokPrivacy}
											onChange={(e) => setTiktokPrivacy(e.target.value)}
											options={Object.entries(PRIVACY_LABEL).map(([val, label]) => ({
												label,
												value: val,
											}))}
										/>
									</div>
								) : null}
							</div>

							{publishError ? (
								<p className="rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300">
									{publishError}
								</p>
							) : null}

							{/* Results list */}
							{publishResults?.length ? (
								<div className="space-y-2 border-t border-border pt-3">
									<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
										Publish Status
									</label>
									<div className="space-y-1.5">
										{publishResults.map((r) => (
											<div
												key={r.id}
												className="flex items-center justify-between rounded-lg border border-border p-2.5 text-xs"
											>
												<span className="font-medium capitalize">{r.provider}</span>
												<span
													className={cn(
														"font-semibold capitalize",
														r.status === "posted"
															? "text-teal-400"
															: r.status === "failed"
																? "text-red-400"
																: "text-amber-400 animate-pulse",
													)}
												>
													{r.status}
												</span>
											</div>
										))}
									</div>
								</div>
							) : null}

							{/* Trigger Action */}
							<button
								type="button"
								onClick={handlePublish}
								disabled={publishing || selectedAccs.size === 0}
								className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#14b8a6] py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-40"
							>
								{publishing ? (
									<>
										<Loader2 className="size-4 animate-spin" /> Publishing…
									</>
								) : (
									<>
										<Send className="size-4" /> Publish Now ({selectedAccs.size})
									</>
								)}
							</button>
						</div>
					) : (
						/* SHARE LINKS VIEW */
						<div className="space-y-5">
							<p className="text-xs text-muted-foreground">
								Generate private share URLs for client review or presentation mode.
							</p>

							{/* Review Mode Link */}
							<div className="rounded-xl border border-border p-4 space-y-3">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<MessageSquareText className="size-4 text-[#14b8a6]" />
										<span className="text-sm font-semibold">Review Link</span>
									</div>
									<button
										type="button"
										onClick={() => toggleShare("review")}
										disabled={sharingMode === "review"}
										className="text-xs font-semibold text-[#14b8a6] hover:underline disabled:opacity-50"
									>
										{sharingMode === "review"
											? "Updating…"
											: shareTokens.review
												? "Revoke Link"
												: "Enable Link"}
									</button>
								</div>

								{shareTokens.review ? (
									<div className="flex items-center gap-2">
										<input
											type="text"
											readOnly
											value={`${window.location.origin}/watch/${shareTokens.review}`}
											className="w-full rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs outline-none"
										/>
										<button
											type="button"
											onClick={() =>
												navigator.clipboard.writeText(
													`${window.location.origin}/watch/${shareTokens.review}`,
												)
											}
											className="flex shrink-0 items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
										>
											<Copy className="size-3.5" /> Copy
										</button>
									</div>
								) : (
									<p className="text-xs text-muted-foreground">
										Allows viewers to leave timestamped comments.
									</p>
								)}
							</div>

							{/* Presentation Mode Link */}
							<div className="rounded-xl border border-border p-4 space-y-3">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<Presentation className="size-4 text-[#14b8a6]" />
										<span className="text-sm font-semibold">Presentation Link</span>
									</div>
									<button
										type="button"
										onClick={() => toggleShare("presentation")}
										disabled={sharingMode === "presentation"}
										className="text-xs font-semibold text-[#14b8a6] hover:underline disabled:opacity-50"
									>
										{sharingMode === "presentation"
											? "Updating…"
											: shareTokens.presentation
												? "Revoke Link"
												: "Enable Link"}
									</button>
								</div>

								{shareTokens.presentation ? (
									<div className="flex items-center gap-2">
										<input
											type="text"
											readOnly
											value={`${window.location.origin}/watch/${shareTokens.presentation}`}
											className="w-full rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs outline-none"
										/>
										<button
											type="button"
											onClick={() =>
												navigator.clipboard.writeText(
													`${window.location.origin}/watch/${shareTokens.presentation}`,
												)
											}
											className="flex shrink-0 items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
										>
											<Copy className="size-3.5" /> Copy
										</button>
									</div>
								) : (
									<p className="text-xs text-muted-foreground">
										Clean view-only playback player without comment overlays.
									</p>
								)}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

function GlobeIcon(p: IconProps) => (
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden {...p}>
		<circle cx="12" cy="12" r="10" />
		<line x1="2" y1="12" x2="22" y2="12" />
		<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
	</svg>
);
