"use client";

import { Crown, Gem, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useBillingSettings } from "../hooks/use-billing-settings";
import { Row, SectionLabel } from "./settings-primitives";

const USAGE_LABELS: Record<string, string> = {
  "clips-ingest": "Clip job — ingest & transcribe",
  "clips-select": "Clip job — AI moment selection",
  "clips-render": "Clip job — rendering",
};

export function BillingTab() {
  const { balance, spend, usage, cancelSubscription, isCanceling } = useBillingSettings();
  const plan = balance?.plan ?? "free";
  const isPaid = plan !== "free";

  return (
    <div>
      <SectionLabel>Plan</SectionLabel>
      <Row label="Current plan" hint={isPaid ? "Receipts arrive by email from Dodo Payments" : undefined}>
        <span className="flex items-center gap-2 text-sm font-semibold capitalize">
          {isPaid ? <Crown className="size-4 text-amber-300" /> : null}
          {plan.replace("_", " ")}
          {!isPaid ? (
            <a
              href="/pricing"
              className="ml-3 rounded-lg bg-teal-400 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-300"
            >
              Upgrade
            </a>
          ) : null}
        </span>
      </Row>
      <Row label="Available credits">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-400/10 px-3 py-1 text-sm font-bold tabular-nums text-teal-300">
            <span className="grid size-5 place-items-center rounded-full bg-teal-400 text-black">
              <Gem className="size-3 fill-black text-black" />
            </span>
            {balance ? Math.floor(balance.balance).toLocaleString() : "…"} credits
          </span>
          <a
            href="/pricing"
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold transition-colors hover:bg-white/10"
          >
            Get More
          </a>
        </div>
      </Row>
      {isPaid ? (
        <Row label="Cancel subscription" hint="Access and credits stay until the end of the billing period">
          <CancelButton onCancel={cancelSubscription} isCanceling={isCanceling} />
        </Row>
      ) : null}

      <SectionLabel>Usage</SectionLabel>
      <div className="grid grid-cols-2 gap-3 py-4 sm:grid-cols-4">
        {(
          [
            ["Today", spend?.today],
            ["This week", spend?.week],
            ["This month", spend?.month],
            ["All time", spend?.total],
          ] as const
        ).map(([label, v]) => (
          <div key={label} className="rounded-xl border border-white/[0.06] bg-[#141414] p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {v === undefined ? "…" : `$${v.toFixed(2)}`}
            </p>
          </div>
        ))}
      </div>

      <SectionLabel>Credit history</SectionLabel>
      <UsageLedger usage={usage} />
    </div>
  );
}

function CancelButton({ onCancel, isCanceling }: { onCancel: () => void; isCanceling: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);

  if (done) return <span className="text-sm text-teal-300">Cancelled at period end</span>;
  if (confirming)
    return (
      <span className="flex items-center gap-2">
        <button
          type="button"
          disabled={isCanceling}
          onClick={() => {
            onCancel();
            setDone(true);
          }}
          className="rounded-lg border border-red-400/40 px-3 py-1.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-400/10"
        >
          {isCanceling ? <Loader2 className="size-3.5 animate-spin" /> : "Yes, cancel"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Keep plan
        </button>
      </span>
    );
  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="text-sm text-muted-foreground underline underline-offset-2 transition-colors hover:text-red-400"
    >
      Cancel…
    </button>
  );
}

function UsageLedger({ usage }: { usage: import("../types").UsageEntry[] }) {
  if (!usage) return <p className="py-4 text-sm text-muted-foreground">…</p>;
  if (usage.length === 0)
    return <p className="py-4 text-sm text-muted-foreground">No charges yet — run your first job.</p>;
  return (
    <ul className="divide-y divide-white/[0.06]">
      {usage.map((u, i) => (
        <li key={`${u.created_at}-${i}`} className="flex items-baseline gap-3 py-3">
          <span className="w-28 shrink-0 text-xs tabular-nums text-muted-foreground">
            {new Date(u.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}{" "}
            {new Date(u.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm">
            {USAGE_LABELS[u.label] ?? (u.kind === "clips" ? u.label : `Generation — ${u.kind}`)}
          </span>
          <span className="shrink-0 text-sm font-medium tabular-nums text-foreground/90">
            −{u.credits % 1 === 0 ? u.credits : u.credits.toFixed(1)}
          </span>
        </li>
      ))}
    </ul>
  );
}
