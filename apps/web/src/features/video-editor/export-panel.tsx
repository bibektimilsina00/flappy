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
import {
	listSocialAccounts,
	socialConnectUrl,
	socialProviders,
} from "@/features/clips/api";
import {
	publishEditorProject,
	renderEditorProject,
	shareEditorProject,
} from "./api";
import { buildCaptions } from "./captions";
import type { VideoEditorDoc } from "./types";

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

const RESOLUTIONS = [720, 1080] as const;
const FRAMERATES = [24, 30, 60] as const;

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
function downloadText(content: string, name: string, mime: string) {
	const url = URL.createObjectURL(new Blob([content], { type: mime }));
	triggerDownload(url, name);
	URL.revokeObjectURL(url);
}

export function ExportPanel({
	projectId,
	title,
	doc,
	share,
	saveFirst,
	onClose,
}: ExportPanelProps) {
	const qc = useQueryClient();
	const [view, setView] = useState<"main" | "settings">("main");
	const [busy, setBusy] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [links, setLinks] = useState(share);
	const [copied, setCopied] = useState<string | null>(null);
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [caption, setCaption] = useState("");
	const [published, setPublished] = useState<number | null>(null);
	const [moreOpen, setMoreOpen] = useState(false);
	const [settings, setSettings] = useState<{
		name: string;
		resolution: number;
		fps: number;
		format: "mp4" | "gif";
	}>({ name: title || "export", resolution: 1080, fps: 30, format: "mp4" });
	const renderRef = useRef<{ key: string; url: string } | null>(null);

	const { data: accounts } = useQuery({
		queryKey: ["social-accounts"],
		queryFn: listSocialAccounts,
	});
	const { data: providers } = useQuery({
		queryKey: ["social-providers"],
		queryFn: socialProviders,
	});

	// biome-ignore lint/correctness/useExhaustiveDependencies: doc identity is the invalidation signal
	useEffect(() => {
		renderRef.current = null;
		setPublished(null);
	}, [doc]);

	const run = useCallback(async (key: string, fn: () => Promise<void>) => {
		setBusy(key);
		setError(null);
		try {
			await fn();
		} catch (e) {
			setError(e instanceof Error ? e.message : "Something went wrong");
		} finally {
			setBusy(null);
		}
	}, []);

	// Default MP4 render, cached — used for publish + share links.
	const ensureRender = useCallback(async () => {
		if (renderRef.current) return renderRef.current;
		await saveFirst();
		const res = await renderEditorProject(projectId, { format: "mp4" });
		renderRef.current = { key: res.key, url: res.url };
		return renderRef.current;
	}, [projectId, saveFirst]);

	const watchUrl = (token: string) =>
		`${window.location.origin}/watch/${token}`;
	const copyLink = async (token: string) => {
		await navigator.clipboard.writeText(watchUrl(token));
		setCopied(token);
		setTimeout(() => setCopied(null), 1600);
	};
	const createShare = (mode: "review" | "presentation") =>
		run(`share-${mode}`, async () => {
			await ensureRender();
			const res = await shareEditorProject(projectId, mode);
			if (res.token) {
				setLinks((l) => ({ ...l, [mode]: res.token }));
				await copyLink(res.token);
			}
		});
	const revokeShare = (mode: "review" | "presentation") =>
		run(`revoke-${mode}`, async () => {
			await shareEditorProject(projectId, mode, true);
			setLinks((l) => ({ ...l, [mode]: null }));
		});

	// Export-settings screen: render with the chosen resolution/fps/format, download.
	const exportNow = () =>
		run("export", async () => {
			await saveFirst();
			const res = await renderEditorProject(projectId, {
				format: settings.format,
				height: settings.resolution,
				fps: settings.fps,
			});
			triggerDownload(
				res.url,
				`${settings.name || title || "export"}.${settings.format}`,
			);
		});

	const downloadCaptions = (format: "srt" | "vtt") => {
		setMoreOpen(false);
		const content = buildCaptions(doc, format);
		if (!content) {
			setError("No text clips on the timeline — nothing to caption.");
			return;
		}
		downloadText(
			content,
			`${title || "captions"}.${format}`,
			format === "srt" ? "application/x-subrip" : "text/vtt",
		);
	};
	const downloadGif = () =>
		run("gif", async () => {
			setMoreOpen(false);
			await saveFirst();
			const res = await renderEditorProject(projectId, { format: "gif" });
			triggerDownload(res.url, `${title || "export"}.gif`);
		});
	const hasCaptions = doc.tracks.some((t) =>
		t.clips.some((c) => c.kind === "text" && (c.text?.content ?? "").trim()),
	);

	const connect = (platform: string) =>
		run(`connect-${platform}`, async () => {
			const { url } = await socialConnectUrl(platform);
			const popup = window.open(url, "riocut-connect", "width=600,height=740");
			await new Promise<void>((resolve) => {
				const t = setInterval(() => {
					if (!popup || popup.closed) {
						clearInterval(t);
						resolve();
					}
				}, 700);
			});
			await qc.invalidateQueries({ queryKey: ["social-accounts"] });
		});

	const toggle = (id: string) =>
		setSelected((s) => {
			const n = new Set(s);
			if (n.has(id)) n.delete(id);
			else n.add(id);
			return n;
		});
	const publish = () =>
		run("publish", async () => {
			setPublished(null);
			const r = await ensureRender();
			const res = await publishEditorProject(projectId, {
				render_key: r.key,
				account_ids: [...selected],
				title,
				caption,
			});
			setPublished(res.dispatched);
		});

	const connected = accounts ?? [];
	const connectable = Object.entries(providers ?? {})
		.filter(([p, ok]) => ok && !connected.some((a) => a.platform === p))
		.map(([p]) => p);

	return (
		<>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: click-away backdrop */}
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: Esc handled by the close button */}
			<div className="fixed inset-0 z-[110] bg-black/40" onClick={onClose} />
			<aside className="fixed bottom-0 right-0 top-0 z-[120] flex w-[420px] max-w-[92vw] flex-col border-l border-white/10 bg-[#1a1a1a] shadow-2xl">
				<header className="flex items-center gap-2 border-b border-white/10 px-5 py-4">
					{view === "settings" ? (
						<button
							type="button"
							aria-label="Back"
							onClick={() => setView("main")}
							className="-ml-1 grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
						>
							<ArrowLeft className="size-4" />
						</button>
					) : null}
					<h3 className="flex-1 text-lg font-bold">
						{view === "settings" ? "Export settings" : "Export & publish"}
					</h3>
					<button
						type="button"
						aria-label="Close"
						onClick={onClose}
						className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
					>
						<X className="size-4" />
					</button>
				</header>

				{view === "settings" ? (
					<SettingsView
						settings={settings}
						setSettings={setSettings}
						busy={busy === "export"}
						onExport={exportNow}
						error={error}
					/>
				) : (
					<div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
						{/* Share links */}
						<div className="space-y-1.5">
							{[
								{
									mode: "review" as const,
									icon: MessageSquareText,
									label: "Share for review",
									sub: "People can add comments to your video.",
								},
								{
									mode: "presentation" as const,
									icon: Presentation,
									label: "Share as presentation",
									sub: "People can only watch your video.",
								},
							].map(({ mode, icon: Icon, label, sub }) => {
								const token = links[mode];
								return (
									<div
										key={mode}
										className="rounded-lg border border-white/10 bg-white/[0.02]"
									>
										<button
											type="button"
											disabled={busy !== null}
											onClick={() =>
												token ? copyLink(token) : createShare(mode)
											}
											className="flex w-full items-center gap-3 rounded-lg px-3.5 py-3 text-left transition-colors hover:bg-white/5 disabled:opacity-60"
										>
											<Icon className="size-5 shrink-0 text-foreground/80" />
											<span className="min-w-0 flex-1">
												<span className="block text-sm font-semibold">
													{label}
												</span>
												<span className="block truncate text-xs text-muted-foreground">
													{token ? watchUrl(token) : sub}
												</span>
											</span>
											{busy === `share-${mode}` ? (
												<Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
											) : token ? (
												copied === token ? (
													<Check className="size-4 shrink-0 text-emerald-400" />
												) : (
													<Copy className="size-4 shrink-0 text-muted-foreground" />
												)
											) : (
												<ChevronRight className="size-4 shrink-0 text-muted-foreground" />
											)}
										</button>
										{token ? (
											<div className="flex items-center gap-1 border-t border-white/5 px-2 py-1">
												<LinkAction
													icon={Link2}
													label={copied === token ? "Copied!" : "Copy link"}
													onClick={() => copyLink(token)}
												/>
												<LinkAction
													icon={ExternalLink}
													label="Open"
													onClick={() =>
														window.open(watchUrl(token), "_blank", "noopener")
													}
												/>
												<span className="flex-1" />
												<LinkAction
													icon={Trash2}
													label="Revoke"
													onClick={() => revokeShare(mode)}
													danger
												/>
											</div>
										) : null}
									</div>
								);
							})}
						</div>

						{/* Publish to channels */}
						<section>
							<p className="mb-2 text-sm text-muted-foreground">
								Publish to your channels
							</p>
							{accounts === undefined ? (
								<p className="py-1 text-sm text-muted-foreground">
									Loading channels…
								</p>
							) : connected.length === 0 ? (
								<p className="py-1 text-sm text-muted-foreground">
									No channels connected — link one below to publish straight
									from here.
								</p>
							) : (
								<div className="space-y-1.5">
									{connected.map((a) => {
										const meta = PLATFORM[a.platform];
										const Icon = meta?.icon;
										return (
											<label
												key={a.id}
												className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 transition-colors hover:bg-white/5"
											>
												<Checkbox
													checked={selected.has(a.id)}
													onCheckedChange={() => toggle(a.id)}
												/>
												<span
													className={`grid size-8 shrink-0 place-items-center rounded-lg text-white ${meta?.bg ?? "bg-white/10"}`}
												>
													{Icon ? <Icon className="size-4" /> : null}
												</span>
												<span className="min-w-0 flex-1">
													<span className="block text-sm font-medium">
														{meta?.name ?? a.platform}
													</span>
													{a.username ? (
														<span className="block truncate text-xs text-muted-foreground">
															@{a.username}
														</span>
													) : null}
												</span>
											</label>
										);
									})}
								</div>
							)}

							{connectable.length ? (
								<div className="mt-2.5 space-y-1.5">
									{connectable.map((p) => {
										const meta = PLATFORM[p];
										const Icon = meta?.icon;
										return (
											<div
												key={p}
												className="flex items-center gap-3 rounded-lg border border-white/10 px-3 py-2.5"
											>
												<span
													className={`grid size-8 shrink-0 place-items-center rounded-lg text-white ${meta?.bg ?? "bg-white/10"}`}
												>
													{Icon ? <Icon className="size-4" /> : null}
												</span>
												<span className="flex-1 text-sm">
													{meta?.name ?? p}
												</span>
												<button
													type="button"
													disabled={busy !== null}
													onClick={() => connect(p)}
													className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium transition-colors hover:border-teal-400/40 disabled:opacity-60"
												>
													{busy === `connect-${p}` ? (
														<Loader2 className="size-3.5 animate-spin" />
													) : (
														<>
															<Plus className="size-3.5" /> Connect
														</>
													)}
												</button>
											</div>
										);
									})}
								</div>
							) : null}

							{/* Schedule — coming soon */}
							<div className="mt-1.5 flex items-center gap-3 rounded-lg border border-white/10 px-3 py-2.5 opacity-60">
								<span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10 text-foreground/80">
									<CalendarClock className="size-4" />
								</span>
								<span className="flex-1 text-sm">Auto-schedule posts</span>
								<span className="rounded-full bg-violet-500/90 px-2 py-0.5 text-[10px] font-semibold text-white">
									Soon
								</span>
							</div>

							{connected.length > 0 ? (
								<div className="mt-3">
									<textarea
										value={caption}
										onChange={(e) => setCaption(e.target.value)}
										placeholder="Caption (optional) — the post text / description"
										rows={2}
										className="w-full resize-none rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-teal-400/50"
									/>
									<button
										type="button"
										disabled={busy !== null || selected.size === 0}
										onClick={publish}
										className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-400 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-teal-300 disabled:opacity-50"
									>
										{busy === "publish" ? (
											<>
												<Loader2 className="size-4 animate-spin" /> Rendering &
												publishing…
											</>
										) : (
											<>
												<Send className="size-4" /> Publish
												{selected.size ? ` to ${selected.size}` : ""}
											</>
										)}
									</button>
									{published !== null ? (
										<p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400">
											<Check className="size-3.5" /> Publishing to {published}{" "}
											channel{published === 1 ? "" : "s"} — appears once each
											platform finishes processing.
										</p>
									) : null}
								</div>
							) : null}
						</section>

						{/* Download row → export settings + more menu */}
						<div className="flex items-stretch gap-2">
							<button
								type="button"
								onClick={() => setView("settings")}
								className="flex flex-1 items-center gap-3 rounded-lg bg-white/5 px-3.5 py-3 text-left transition-colors hover:bg-white/10"
							>
								<Download className="size-5 text-foreground/80" />
								<span className="flex-1 text-sm font-semibold">Download</span>
								<ChevronRight className="size-4 text-muted-foreground" />
							</button>
							<div className="relative">
								<button
									type="button"
									aria-label="More export options"
									onClick={() => setMoreOpen((v) => !v)}
									className="grid h-full w-12 place-items-center rounded-lg border border-white/10 transition-colors hover:bg-white/5"
								>
									<MoreHorizontal className="size-5 text-foreground/80" />
								</button>
								{moreOpen ? (
									<div className="absolute bottom-full right-0 z-10 mb-1 w-56 rounded-lg border border-white/10 bg-[#262626] p-1.5 shadow-2xl">
										<MenuItem
											tag="GIF"
											label={busy === "gif" ? "Rendering GIF…" : "Download GIF"}
											onClick={downloadGif}
											disabled={busy !== null}
										/>
										<MenuItem
											tag="SRT"
											label="Captions (.srt)"
											onClick={() => downloadCaptions("srt")}
											disabled={!hasCaptions}
										/>
										<MenuItem
											tag="VTT"
											label="Captions (.vtt)"
											onClick={() => downloadCaptions("vtt")}
											disabled={!hasCaptions}
										/>
										{!hasCaptions ? (
											<p className="px-2 pb-1 pt-0.5 text-[11px] text-muted-foreground">
												Add text clips to export captions.
											</p>
										) : null}
									</div>
								) : null}
							</div>
						</div>

						{error ? <p className="text-xs text-red-400">{error}</p> : null}
					</div>
				)}
			</aside>
		</>
	);
}

function SettingsView({
	settings,
	setSettings,
	busy,
	onExport,
	error,
}: {
	settings: {
		name: string;
		resolution: number;
		fps: number;
		format: "mp4" | "gif";
	};
	setSettings: React.Dispatch<React.SetStateAction<typeof settings>>;
	busy: boolean;
	onExport: () => void;
	error: string | null;
}) {
	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
				<Field label="Name">
					<input
						value={settings.name}
						onChange={(e) =>
							setSettings((s) => ({ ...s, name: e.target.value }))
						}
						className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm outline-none focus:border-teal-400/50"
					/>
				</Field>
				<Field label="Resolution">
					<Segmented
						options={RESOLUTIONS.map((r) => ({ value: r, label: `${r}p` }))}
						value={settings.resolution}
						onChange={(v) => setSettings((s) => ({ ...s, resolution: v }))}
					/>
				</Field>
				<Field label="Frame rate">
					<Segmented
						options={FRAMERATES.map((f) => ({ value: f, label: `${f}fps` }))}
						value={settings.fps}
						onChange={(v) => setSettings((s) => ({ ...s, fps: v }))}
					/>
				</Field>
				<Field label="Format">
					<Segmented
						options={[
							{ value: "mp4", label: "MP4" },
							{ value: "gif", label: "GIF" },
						]}
						value={settings.format}
						onChange={(v) => setSettings((s) => ({ ...s, format: v }))}
					/>
				</Field>
				{error ? <p className="text-xs text-red-400">{error}</p> : null}
			</div>
			<div className="border-t border-white/10 p-4">
				<button
					type="button"
					disabled={busy}
					onClick={onExport}
					className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-400 py-3 text-sm font-semibold text-black transition-colors hover:bg-teal-300 disabled:opacity-50"
				>
					{busy ? (
						<>
							<Loader2 className="size-4 animate-spin" /> Rendering…
						</>
					) : (
						<>
							<Download className="size-4" /> Export
						</>
					)}
				</button>
			</div>
		</div>
	);
}

function Field({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div>
			<p className="mb-1.5 text-sm font-semibold">{label}</p>
			{children}
		</div>
	);
}

function Segmented<T extends string | number>({
	options,
	value,
	onChange,
}: {
	options: { value: T; label: string }[];
	value: T;
	onChange: (v: T) => void;
}) {
	return (
		<div className="flex gap-1.5">
			{options.map((o) => (
				<button
					key={String(o.value)}
					type="button"
					onClick={() => onChange(o.value)}
					className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
						o.value === value
							? "border-teal-400 bg-teal-400/10 text-teal-300"
							: "border-white/10 text-foreground/80 hover:bg-white/5"
					}`}
				>
					{o.label}
				</button>
			))}
		</div>
	);
}

function LinkAction({
	icon: Icon,
	label,
	onClick,
	danger,
}: {
	icon: LucideIcon;
	label: string;
	onClick: () => void;
	danger?: boolean;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition-colors hover:bg-white/10 ${danger ? "text-red-400/90" : "text-muted-foreground hover:text-foreground"}`}
		>
			<Icon className="size-3.5" />
			{label}
		</button>
	);
}

function MenuItem({
	tag,
	label,
	onClick,
	disabled,
}: {
	tag: string;
	label: string;
	onClick: () => void;
	disabled?: boolean;
}) {
	return (
		<button
			type="button"
			disabled={disabled}
			onClick={onClick}
			className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm text-foreground/90 transition-colors hover:bg-white/10 disabled:opacity-50"
		>
			<span className="w-8 shrink-0 text-[10px] font-bold text-muted-foreground">
				{tag}
			</span>
			{label}
		</button>
	);
}
