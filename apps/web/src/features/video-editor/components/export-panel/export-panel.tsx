"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  Link2,
  Loader2,
  MessageSquareText,
  MoreHorizontal,
  Plus,
  Presentation,
  Send,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PLATFORMS } from "@/features/clips/components/publish-panel";
import { socialConnectUrl, socialProviders } from "@/features/clips/services/clips-api";
import { cn } from "@/lib/cn";
import { Select } from "@/shared/components/select";
import { buildCaptions } from "../../lib/captions";
import { renderEditorProject, shareEditorProject } from "../../services/video-editor-api";
import type { VideoEditorDoc } from "../../types";
import { useExportPanel } from "./hooks/use-export-panel";

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
  // Flush the latest doc to the server before rendering.
  saveFirst: () => Promise<void>;
  onClose: () => void;
}


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
    const res = await renderEditorProject(projectId, { format: "mp4" });
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
      const res = await renderEditorProject(projectId, { format: "gif" });
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

  // Direct publish to connected social accounts (same flow as clips Publish).
  const {
    socialAccs,
    selectedAccs,
    toggleAcc,
    postCaption,
    setPostCaption,
    setPostTitle,
    tiktokAcc,
    tiktokPrivacy,
    setTiktokPrivacy,
    publishing,
    publishResults,
    publishError,
    handlePublish,
  } = useExportPanel({ projectId, title, doc, share, saveFirst });
  const qc = useQueryClient();
  const [providers, setProviders] = useState<Record<string, boolean> | null>(null);
  useEffect(() => {
    socialProviders()
      .then(setProviders)
      .catch(() => setProviders({}));
  }, []);
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.data === "riocut:social-connected") qc.invalidateQueries({ queryKey: ["social-accounts"] });
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [qc]);
  const connect = (provider: string) =>
    socialConnectUrl(provider)
      .then(({ url }) => window.open(url, "riocut-connect", "width=640,height=760"))
      .catch(() => {});

  const hasCaptions = doc.tracks.some((t) => t.clips.some((c) => c.kind === "text" && (c.text?.content ?? "").trim()));

  return (
    <div className="fixed inset-0 z-[200] bg-black/60">
      <aside
        ref={ref}
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col overflow-y-auto border-l border-white/10 bg-[#191919] p-5 shadow-2xl animate-in slide-in-from-right duration-200 [scrollbar-width:thin]"
      >
      <h3 className="mb-4 text-lg font-bold">Export</h3>

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

      {/* Publish to connected socials (same flow as clips Publish) */}
      <p className="mb-2 mt-5 text-sm text-muted-foreground">Publish to your socials</p>
      <div className="space-y-2">
        {PLATFORMS.map((p) => {
          const mine = socialAccs.filter((a) => a.platform === p.key);
          const configured = providers?.[p.provider] === true;
          const pending = providers != null && !configured;
          return (
            <div
              key={p.key}
              className={cn(
                "rounded-xl border px-3 py-2.5",
                mine.length > 0 ? "border-white/[0.12] bg-white/[0.03]" : "border-white/[0.07]",
                pending && mine.length === 0 && "opacity-60",
              )}
            >
              <div className="flex items-center gap-3">
                <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", p.bg)}>
                  <p.icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{p.name}</p>
                  {mine.length > 0 ? (
                    <p className="text-[11px] text-muted-foreground">
                      {mine.length === 1 ? "1 account connected" : `${mine.length} accounts connected`}
                    </p>
                  ) : !pending ? (
                    <p className="text-[11px] text-muted-foreground">Not connected yet</p>
                  ) : null}
                </div>
                {pending ? (
                  <span className="shrink-0 rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                    Coming soon
                  </span>
                ) : mine.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => connect(p.provider)}
                    className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                  >
                    <Plus className="size-3.5" /> Add another
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => connect(p.provider)}
                    className="flex shrink-0 items-center gap-1 rounded-lg bg-teal-400/10 px-2.5 py-1.5 text-xs font-semibold text-teal-300 transition-colors hover:bg-teal-400/20"
                  >
                    <Plus className="size-3.5" /> Connect
                  </button>
                )}
              </div>
              {mine.length > 0 ? (
                <div className="mt-2.5 space-y-1.5">
                  {mine.map((a) => {
                    const on = selectedAccs.has(a.id);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => toggleAcc(a.id)}
                        aria-pressed={on}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors",
                          on ? "border-teal-400/60 bg-teal-400/10" : "border-white/10 hover:border-white/25 hover:bg-white/[0.04]",
                        )}
                      >
                        <span
                          className={cn(
                            "grid size-[18px] shrink-0 place-items-center rounded-md border transition-colors",
                            on ? "border-teal-400 bg-teal-400 text-black" : "border-white/30",
                          )}
                        >
                          {on ? <Check className="size-3" /> : null}
                        </span>
                        {a.avatar_url ? (
                          // biome-ignore lint/nursery/noImgElement: avatar thumbnail
                          // biome-ignore lint/a11y/useAltText: decorative
                          <img src={a.avatar_url} alt="" className="size-6 rounded-full object-cover" />
                        ) : (
                          <span className={cn("grid size-6 place-items-center rounded-full", p.bg)}>
                            <p.icon className="size-3" />
                          </span>
                        )}
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{a.username ?? p.name}</span>
                        {on ? <span className="shrink-0 text-[11px] font-medium text-teal-300">Selected</span> : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {socialAccs.length > 0 ? (
        <>
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Caption</p>
            <textarea
              value={postCaption}
              onChange={(e) => {
                setPostCaption(e.target.value);
                setPostTitle(e.target.value.split("\n")[0] ?? "");
              }}
              rows={3}
              placeholder="Write the post caption…"
              className="w-full resize-none rounded-xl border border-white/10 bg-transparent px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-teal-400/50 [scrollbar-width:thin]"
            />
          </div>
          {tiktokAcc && selectedAccs.has(tiktokAcc.id) ? (
            <div className="mt-3">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">TikTok privacy</p>
              <Select
                value={tiktokPrivacy}
                onChange={(v: string) => setTiktokPrivacy(v)}
                options={Object.entries(PRIVACY_LABEL).map(([value, label]) => ({ value, label }))}
              />
            </div>
          ) : null}
          {publishError ? <p className="mt-3 text-xs text-red-400">{publishError}</p> : null}
          {publishResults?.length ? (
            <div className="mt-3 space-y-1.5">
              {publishResults.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-2.5 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-xs"
                >
                  <span className="flex-1 font-medium capitalize">{r.platform}</span>
                  <span
                    className={cn(
                      "font-semibold capitalize",
                      r.status === "posted" ? "text-teal-300" : r.status === "failed" ? "text-red-400" : "text-amber-300",
                    )}
                  >
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing || selectedAccs.size === 0}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 py-2.5 text-sm font-bold text-white shadow-lg shadow-teal-500/25 transition-all hover:shadow-xl hover:shadow-teal-500/40 disabled:opacity-50 disabled:shadow-none"
          >
            {publishing ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Publishing…
              </>
            ) : (
              <>
                <Send className="size-4" />
                {selectedAccs.size > 1 ? `Publish to ${selectedAccs.size} accounts` : "Publish now"}
              </>
            )}
          </button>
        </>
      ) : null}

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
      </aside>
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
