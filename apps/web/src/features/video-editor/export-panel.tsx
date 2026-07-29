"use client";

import {
  CalendarClock,
  Check,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  Link2,
  Loader2,
  Megaphone,
  MessageSquareText,
  MoreHorizontal,
  Presentation,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { type ComponentType, useCallback, useEffect, useRef, useState } from "react";
import { buildCaptions } from "./captions";
import { renderEditorProject, shareEditorProject } from "./api";
import type { VideoEditorDoc } from "./types";

interface ExportPanelProps {
  projectId: string;
  title: string;
  doc: VideoEditorDoc;
  share: { review: string | null; presentation: string | null };
  // Flush the latest doc to the server before rendering.
  saveFirst: () => Promise<void>;
  onClose: () => void;
}

// Brand glyphs (lucide has no brand icons) — white on the platform-colored circle.
type IconProps = { className?: string };

function TikTokIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.3 0 .6.05.88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z" />
    </svg>
  );
}

function PlayIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M8 5.14v13.72L19 12 8 5.14z" />
    </svg>
  );
}

function FacebookIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M13.4 21v-8.1h2.72l.4-3.16H13.4V7.72c0-.91.25-1.53 1.56-1.53h1.67V3.36c-.29-.04-1.28-.13-2.43-.13-2.4 0-4.05 1.47-4.05 4.16v2.32H7.43v3.16h2.72V21h3.25z" />
    </svg>
  );
}

function InstagramIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

// After download we open the platform's upload page — direct in-app publishing
// needs per-platform OAuth apps (connected accounts), which don't exist yet.
const SOCIALS: { key: string; label: string; icon: ComponentType<IconProps>; bg: string; href: string }[] = [
  { key: "tiktok", label: "TikTok", icon: TikTokIcon, bg: "bg-black", href: "https://www.tiktok.com/upload" },
  { key: "tiktok-ads", label: "TikTok Ads Manager", icon: Megaphone, bg: "bg-black", href: "https://ads.tiktok.com/" },
  { key: "youtube", label: "YouTube", icon: PlayIcon, bg: "bg-[#FF0000]", href: "https://www.youtube.com/upload" },
  { key: "shorts", label: "YouTube Shorts", icon: PlayIcon, bg: "bg-[#FF0000]", href: "https://www.youtube.com/upload" },
  { key: "facebook", label: "Facebook Page", icon: FacebookIcon, bg: "bg-[#1877F2]", href: "https://www.facebook.com/" },
  {
    key: "reels",
    label: "Instagram Reels",
    icon: InstagramIcon,
    bg: "bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]",
    href: "https://www.instagram.com/",
  },
];

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

export function ExportPanel({ projectId, title, doc, share, saveFirst, onClose }: ExportPanelProps) {
  const [busy, setBusy] = useState<string | null>(null); // action key while working
  const [error, setError] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [links, setLinks] = useState(share);
  const [copied, setCopied] = useState<string | null>(null);
  // Latest MP4 render this session — invalidated when the doc changes.
  const renderRef = useRef<{ url: string } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: doc identity is the invalidation signal
  useEffect(() => {
    renderRef.current = null;
  }, [doc]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [onClose]);

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

  const ensureRender = useCallback(async (): Promise<{ url: string }> => {
    if (renderRef.current) return renderRef.current;
    await saveFirst();
    const res = await renderEditorProject(projectId, "mp4");
    renderRef.current = { url: res.url };
    return renderRef.current;
  }, [projectId, saveFirst]);

  const watchUrl = (token: string) => `${window.location.origin}/watch/${token}`;

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

  const downloadMp4 = () =>
    run("download", async () => {
      const r = await ensureRender();
      triggerDownload(r.url, `${title || "export"}.mp4`);
    });

  const downloadGif = () =>
    run("gif", async () => {
      setMoreOpen(false);
      await saveFirst();
      const res = await renderEditorProject(projectId, "gif");
      triggerDownload(res.url, `${title || "export"}.gif`);
    });

  const downloadCaptions = (format: "srt" | "vtt") => {
    setMoreOpen(false);
    const content = buildCaptions(doc, format);
    if (!content) {
      setError("No text clips on the timeline — nothing to caption.");
      return;
    }
    downloadText(content, `${title || "captions"}.${format}`, format === "srt" ? "application/x-subrip" : "text/vtt");
  };

  const social = (item: (typeof SOCIALS)[number]) =>
    run(item.key, async () => {
      const r = await ensureRender();
      triggerDownload(r.url, `${title || "export"}.mp4`);
      window.open(item.href, "_blank", "noopener");
    });

  const hasCaptions = doc.tracks.some((t) => t.clips.some((c) => c.kind === "text" && (c.text?.content ?? "").trim()));

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-[120] mt-2 w-[400px] rounded-2xl border border-white/10 bg-[#1e1e1e] p-4 shadow-2xl"
    >
      <h3 className="mb-3 text-lg font-bold">Export</h3>

      {/* Share cards */}
      {(
        [
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
        ]
      ).map(({ mode, icon: Icon, label, sub }) => {
        const token = links[mode];
        return (
          <div key={mode} className="mb-2 rounded-xl bg-white/5">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => (token ? copyLink(token) : createShare(mode))}
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-colors hover:bg-white/5 disabled:opacity-60"
            >
              <Icon className="size-5 shrink-0 text-foreground/80" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{label}</span>
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
                <LinkAction icon={Link2} label={copied === token ? "Copied!" : "Copy link"} onClick={() => copyLink(token)} />
                <LinkAction icon={ExternalLink} label="Open" onClick={() => window.open(watchUrl(token), "_blank", "noopener")} />
                <span className="flex-1" />
                <LinkAction icon={Trash2} label="Revoke" onClick={() => revokeShare(mode)} danger />
              </div>
            ) : null}
          </div>
        );
      })}

      {/* Social grid */}
      <p className="mb-2 mt-4 text-sm text-muted-foreground">Share on social</p>
      <div className="grid grid-cols-4 gap-x-2 gap-y-4">
        {SOCIALS.map((item) => (
          <button
            key={item.key}
            type="button"
            disabled={busy !== null}
            onClick={() => social(item)}
            className="group flex flex-col items-center gap-1.5 disabled:opacity-60"
          >
            <span
              className={`grid size-12 place-items-center rounded-full text-white transition-transform group-hover:scale-105 ${item.bg}`}
            >
              {busy === item.key ? <Loader2 className="size-5 animate-spin" /> : <item.icon className="size-5" />}
            </span>
            <span className="text-center text-xs leading-tight text-foreground/90">{item.label}</span>
          </button>
        ))}
        <div className="relative flex flex-col items-center gap-1.5 opacity-60">
          <span className="absolute -top-2 right-1 rounded-full bg-violet-500/90 px-1.5 py-0.5 text-[9px] font-semibold text-white">
            Soon
          </span>
          <span className="grid size-12 place-items-center rounded-full bg-white/10 text-foreground/80">
            <CalendarClock className="size-5" />
          </span>
          <span className="text-center text-xs leading-tight text-foreground/90">Schedule</span>
        </div>
      </div>
      <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
        Your MP4 downloads first, then the platform's upload page opens in a new tab.
      </p>

      {/* Download row */}
      <div className="mt-4 flex items-stretch gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={downloadMp4}
          className="flex flex-1 items-center gap-3 rounded-xl bg-white/5 px-3.5 py-3 text-left transition-colors hover:bg-white/10 disabled:opacity-60"
        >
          {busy === "download" ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : (
            <Download className="size-5 text-foreground/80" />
          )}
          <span className="flex-1 text-sm font-semibold">{busy === "download" ? "Rendering…" : "Download"}</span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </button>
        <div className="relative">
          <button
            type="button"
            aria-label="More export options"
            onClick={() => setMoreOpen((v) => !v)}
            className="grid h-full w-12 place-items-center rounded-xl border border-white/10 transition-colors hover:bg-white/5"
          >
            <MoreHorizontal className="size-5 text-foreground/80" />
          </button>
          {moreOpen ? (
            <div className="absolute right-0 top-full z-10 mt-1 w-56 rounded-xl border border-white/10 bg-[#262626] p-1.5 shadow-2xl">
              <MenuItem
                label={busy === "gif" ? "Rendering GIF…" : "Download GIF"}
                tag="GIF"
                onClick={downloadGif}
                disabled={busy !== null}
              />
              <MenuItem
                label="Captions (.srt)"
                tag="SRT"
                onClick={() => downloadCaptions("srt")}
                disabled={!hasCaptions}
              />
              <MenuItem
                label="Captions (.vtt)"
                tag="VTT"
                onClick={() => downloadCaptions("vtt")}
                disabled={!hasCaptions}
              />
              {!hasCaptions ? (
                <p className="px-2 pb-1 pt-0.5 text-[11px] text-muted-foreground">Add text clips to export captions.</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {error ? <p className="mt-3 text-xs text-red-400">{error}</p> : null}
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
      className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition-colors hover:bg-white/10 ${
        danger ? "text-red-400/90" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}

function MenuItem({
  label,
  tag,
  onClick,
  disabled,
}: {
  label: string;
  tag: string;
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
      <span className="w-8 shrink-0 text-[10px] font-bold text-muted-foreground">{tag}</span>
      {label}
    </button>
  );
}
