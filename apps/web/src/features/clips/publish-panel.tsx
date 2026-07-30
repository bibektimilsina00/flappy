"use client";

import { Check, ExternalLink, Loader2, Plus, Send, X, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import {
  disconnectSocialAccount,
  listSchedule,
  listSocialAccounts,
  publishClipNow,
  type PublishResult,
  type SocialAccount,
  socialConnectUrl,
  socialProviders,
} from "./api";

type GlyphProps = { className?: string };
const Glyph = (d: string, viewBox = "0 0 24 24") =>
  function BrandGlyph({ className }: GlyphProps) {
    return (
      <svg viewBox={viewBox} className={className} fill="currentColor" fillRule="evenodd" aria-hidden="true">
        <path d={d} />
      </svg>
    );
  };

// provider = which OAuth flow connects it
const PLATFORMS = [
  { key: "tiktok", name: "TikTok", provider: "tiktok", bg: "bg-black text-white", icon: Glyph("M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.3 0 .6.05.88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z") },
  { key: "youtube", name: "YouTube", provider: "youtube", bg: "bg-[#FF0000] text-white", icon: Glyph("M10 15V9l5.2 3zM21.58 7.19a2.5 2.5 0 0 0-1.76-1.77C18.25 5 12 5 12 5s-6.25 0-7.82.42A2.5 2.5 0 0 0 2.42 7.19 26 26 0 0 0 2 12a26 26 0 0 0 .42 4.81 2.5 2.5 0 0 0 1.76 1.77C5.75 19 12 19 12 19s6.25 0 7.82-.42a2.5 2.5 0 0 0 1.76-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.42-4.81z") },
  { key: "instagram", name: "Instagram", provider: "instagram", bg: "bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white", icon: Glyph("M12 8.75A3.25 3.25 0 1 0 15.25 12 3.25 3.25 0 0 0 12 8.75zm0-2.5A5.75 5.75 0 1 1 6.25 12 5.75 5.75 0 0 1 12 6.25zm6.5-.75a1.25 1.25 0 1 1-1.25-1.25A1.25 1.25 0 0 1 18.5 5.5zM12 3.5c-2.72 0-3.06 0-4.12.06a5.6 5.6 0 0 0-1.88.35 3.77 3.77 0 0 0-2.16 2.16 5.6 5.6 0 0 0-.35 1.88C3.5 8.94 3.5 9.28 3.5 12s0 3.06.06 4.12a5.6 5.6 0 0 0 .35 1.88 3.77 3.77 0 0 0 2.16 2.16 5.6 5.6 0 0 0 1.88.35c1.06.06 1.4.06 4.12.06s3.06 0 4.12-.06a5.6 5.6 0 0 0 1.88-.35 3.77 3.77 0 0 0 2.16-2.16 5.6 5.6 0 0 0 .35-1.88c.06-1.06.06-1.4.06-4.12s0-3.06-.06-4.12a5.6 5.6 0 0 0-.35-1.88 3.77 3.77 0 0 0-2.16-2.16 5.6 5.6 0 0 0-1.88-.35C15.06 3.5 14.72 3.5 12 3.5z") },
  { key: "facebook", name: "Facebook", provider: "facebook", bg: "bg-[#1877F2] text-white", icon: Glyph("M13.4 21v-8.1h2.72l.4-3.16H13.4V7.72c0-.91.25-1.53 1.56-1.53h1.67V3.36c-.29-.04-1.28-.13-2.43-.13-2.4 0-4.05 1.47-4.05 4.16v2.32H7.43v3.16h2.72V21h3.25z") },
  { key: "x", name: "X", provider: "x", bg: "bg-white text-black", icon: Glyph("M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.46l8.6-9.83L0 1.15h7.59l5.24 6.93zm-1.29 19.5h2.04L6.49 3.24H4.3z") },
  { key: "linkedin", name: "LinkedIn", provider: "linkedin", bg: "bg-[#0A66C2] text-white", icon: Glyph("M6.94 8.5v12H3.56v-12h3.38zM7.07 5.25a1.82 1.82 0 1 1-1.83-1.82 1.82 1.82 0 0 1 1.83 1.82zM20.5 13.9v6.6h-3.37v-6.2c0-1.56-.56-2.62-1.96-2.62a2.11 2.11 0 0 0-1.98 1.41 2.64 2.64 0 0 0-.13.94v6.47H9.68v-12h3.38v1.71a3.35 3.35 0 0 1 3.04-1.68c2.22 0 3.9 1.45 3.9 4.57z") },
] as const;

const TERMINAL = new Set(["posted", "failed"]);

// Right-side "Publish to social" sheet: pick connected accounts, write the
// caption, publish now — live per-account status while the worker posts.
export function PublishPanel({
  jobId,
  clipId,
  clipTitle,
  onClose,
}: {
  jobId: string;
  clipId: string;
  clipTitle: string;
  onClose: () => void;
}) {
  const [accounts, setAccounts] = useState<SocialAccount[] | null>(null);
  const [providers, setProviders] = useState<Record<string, boolean> | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [caption, setCaption] = useState(clipTitle);
  const [results, setResults] = useState<PublishResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    listSocialAccounts().then(setAccounts).catch(() => setAccounts([]));
  }, []);
  useEffect(() => {
    load();
    socialProviders().then(setProviders).catch(() => setProviders({}));
  }, [load]);

  // The OAuth popup pings us when the callback lands.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.data === "flappy:social-connected") load();
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [load]);

  // After publish: poll until every post reaches posted/failed.
  useEffect(() => {
    if (!results || results.every((r) => TERMINAL.has(r.status))) return;
    const t = setInterval(() => {
      listSchedule()
        .then((all) =>
          setResults((cur) =>
            cur?.map((r) => {
              const fresh = all.find((p) => p.id === r.id);
              return fresh ? { ...r, status: fresh.status, result_url: fresh.result_url, error: fresh.error } : r;
            }) ?? null,
          ),
        )
        .catch(() => {});
    }, 2500);
    return () => clearInterval(t);
  }, [results]);

  const connect = (provider: string) => {
    setError(null);
    socialConnectUrl(provider)
      .then(({ url }) => window.open(url, "flappy-connect", "width=640,height=760"))
      .catch((e) => setError(e instanceof Error ? e.message : "Could not start the connection"));
  };

  const publish = () => {
    setBusy(true);
    setError(null);
    publishClipNow(jobId, clipId, { account_ids: [...selected], caption: caption.trim() || undefined })
      .then(setResults)
      .catch((e) => setError(e instanceof Error ? e.message : "Publish failed"))
      .finally(() => setBusy(false));
  };

  const toggle = (id: string) =>
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="dark fixed inset-0 z-[200] bg-black/60" onClick={onClose}>
      <aside
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-white/10 bg-[#191919] text-foreground shadow-2xl animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-4">
          <div className="min-w-0">
            <h3 className="text-[15px] font-bold">Publish to social</h3>
            <p className="truncate text-xs text-muted-foreground">{clipTitle}</p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        {results ? (
          <PublishResults results={results} onDone={onClose} />
        ) : (
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5 [scrollbar-width:thin]">
            <div className="space-y-2.5">
              {PLATFORMS.map((p) => {
                const mine = (accounts ?? []).filter((a) => a.platform === p.key);
                const configured = p.provider !== null && providers?.[p.provider] === true;
                return (
                  <div key={p.key} className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-3">
                    <div className="flex items-center gap-3">
                      <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", p.bg)}>
                        <p.icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1 text-sm font-semibold">{p.name}</span>
                      {p.provider === null || (providers && !configured) ? (
                        <span className="shrink-0 text-[11px] text-muted-foreground">Awaiting app approval</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => p.provider && connect(p.provider)}
                          className="flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-teal-300 transition-colors hover:bg-teal-400/10"
                        >
                          <Plus className="size-3.5" /> Connect
                        </button>
                      )}
                    </div>
                    {mine.length > 0 ? (
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {mine.map((a) => {
                          const on = selected.has(a.id);
                          return (
                            <span key={a.id} className="group/acc flex items-center">
                              <button
                                type="button"
                                onClick={() => toggle(a.id)}
                                className={cn(
                                  "flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-xs font-medium transition-colors",
                                  on
                                    ? "border-teal-400/60 bg-teal-400/10 text-teal-200"
                                    : "border-white/10 text-muted-foreground hover:border-white/25 hover:text-foreground",
                                )}
                              >
                                {a.avatar_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={a.avatar_url} alt="" className="size-5 rounded-full object-cover" />
                                ) : (
                                  <span className={cn("grid size-5 place-items-center rounded-full text-[9px]", p.bg)}>
                                    {(a.username ?? p.name).slice(0, 1).toUpperCase()}
                                  </span>
                                )}
                                {a.username ?? p.name}
                                {on ? <Check className="size-3" /> : null}
                              </button>
                              <button
                                type="button"
                                aria-label={`Disconnect ${a.username ?? p.name}`}
                                title="Disconnect"
                                onClick={() => {
                                  void disconnectSocialAccount(a.id).then(() => {
                                    setSelected((cur) => {
                                      const next = new Set(cur);
                                      next.delete(a.id);
                                      return next;
                                    });
                                    load();
                                  });
                                }}
                                className="ml-0.5 hidden rounded-full p-1 text-muted-foreground hover:text-red-400 group-hover/acc:block"
                              >
                                <X className="size-3" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Caption</p>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
                placeholder="Write the post caption…"
                className="w-full resize-none rounded-xl border border-white/10 bg-transparent px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-teal-400/50 [scrollbar-width:thin]"
              />
            </div>

            {error ? <p className="text-xs text-red-400">{error}</p> : null}
          </div>
        )}

        {!results ? (
          <div className="border-t border-white/[0.07] px-6 py-4">
            <button
              type="button"
              disabled={busy || selected.size === 0}
              onClick={publish}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-400 py-3 text-sm font-semibold text-black transition-colors hover:bg-teal-300 disabled:opacity-50"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {selected.size > 1 ? `Publish to ${selected.size} accounts` : "Publish now"}
            </button>
            {accounts !== null && accounts.length === 0 ? (
              <p className="mt-2.5 text-center text-[11px] leading-relaxed text-muted-foreground">
                Connect an account above to publish directly — or download the clip and post it from the platform's app.
              </p>
            ) : null}
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function PublishResults({ results, onDone }: { results: PublishResult[]; onDone: () => void }) {
  const allDone = results.every((r) => TERMINAL.has(r.status));
  return (
    <div className="flex min-h-0 flex-1 flex-col px-6 py-5">
      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto [scrollbar-width:thin]">
        {results.map((r) => (
          <div key={r.id} className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
            {r.status === "posted" ? (
              <Check className="size-4 shrink-0 text-teal-300" />
            ) : r.status === "failed" ? (
              <XCircle className="size-4 shrink-0 text-red-400" />
            ) : (
              <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {r.account ?? r.platform}
                <span className="ml-2 text-xs font-normal capitalize text-muted-foreground">{r.platform}</span>
              </p>
              {r.status === "failed" && r.error ? (
                <p className="mt-0.5 line-clamp-2 text-xs text-red-400/90">{r.error}</p>
              ) : null}
            </div>
            {r.status === "posted" && r.result_url ? (
              <a
                href={r.result_url}
                target="_blank"
                rel="noreferrer"
                className="flex shrink-0 items-center gap-1 text-xs font-semibold text-teal-300 hover:text-teal-200"
              >
                View <ExternalLink className="size-3" />
              </a>
            ) : (
              <span className="shrink-0 text-[11px] capitalize text-muted-foreground">
                {r.status === "posting" ? "Posting…" : r.status}
              </span>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onDone}
        className="mt-4 w-full rounded-xl border border-white/15 py-3 text-sm font-semibold transition-colors hover:bg-white/5"
      >
        {allDone ? "Done" : "Close — posting continues in background"}
      </button>
    </div>
  );
}
