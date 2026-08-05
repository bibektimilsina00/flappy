"use client";

import { Loader2, Unlink } from "lucide-react";
import { useConnections } from "../hooks/use-connections";
import { Row, SectionLabel } from "./settings-primitives";

const PLATFORM_NAMES: Record<string, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  instagram: "Instagram",
  facebook: "Facebook",
  x: "X (Twitter)",
  linkedin: "LinkedIn",
};

export function ConnectionsTab() {
  const { accounts, providers, busy, connect, disconnect, isDisconnecting } = useConnections();

  const connectable = Object.entries(providers ?? {}).filter(([, ok]) => ok);
  const pending = Object.entries(providers ?? {}).filter(([, ok]) => !ok);

  return (
    <div>
      <SectionLabel>Connected</SectionLabel>
      {accounts === undefined ? (
        <p className="py-4 text-sm text-muted-foreground">…</p>
      ) : accounts.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">
          Nothing connected yet — link an account below to publish clips directly.
        </p>
      ) : (
        accounts.map((a) => (
          <Row key={a.id} label={PLATFORM_NAMES[a.platform] ?? a.platform} hint={a.username ?? undefined}>
            <button
              type="button"
              disabled={isDisconnecting}
              onClick={() => disconnect(a.id)}
              className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-red-400/40 hover:text-red-400"
            >
              <Unlink className="size-3.5" /> Disconnect
            </button>
          </Row>
        ))
      )}

      <SectionLabel>Connect a platform</SectionLabel>
      {connectable.map(([platform]) => (
        <Row key={platform} label={PLATFORM_NAMES[platform] ?? platform}>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void connect(platform)}
            className="rounded-lg border border-white/15 px-3.5 py-1.5 text-xs font-medium transition-colors hover:border-teal-400/40 disabled:opacity-60"
          >
            {busy === platform ? <Loader2 className="size-3.5 animate-spin" /> : "Connect"}
          </button>
        </Row>
      ))}
      {pending.length ? (
        <p className="py-3 text-xs text-muted-foreground/70">
          Coming soon: {pending.map(([p]) => PLATFORM_NAMES[p] ?? p).join(", ")}
        </p>
      ) : null}
    </div>
  );
}
