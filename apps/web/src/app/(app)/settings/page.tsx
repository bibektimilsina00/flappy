"use client";

import { Check, Crown, Loader2, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useBalance } from "@/features/billing";
import { startUpgrade } from "@/features/billing/services/billing-api";
import { useSession } from "@/stores/session";

const PRO_PERKS = [
  "2,500 credits every month",
  "Paste video links directly",
  "AI video generation",
  "2-hour sources · 1080p · no watermark",
];

export default function Page() {
  const user = useSession((s) => s.user);
  const { data: balance, refetch } = useBalance();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCheckout, setFromCheckout] = useState(false);
  const isPro = balance?.plan === "pro";

  // Back from Dodo checkout: webhooks land within minutes — poll the balance.
  useEffect(() => {
    if (!window.location.search.includes("checkout=done")) return;
    setFromCheckout(true);
    let n = 0;
    const t = setInterval(() => {
      void refetch();
      if (++n >= 24) clearInterval(t);
    }, 5000);
    return () => clearInterval(t);
  }, [refetch]);

  const upgrade = async () => {
    setBusy(true);
    setError(null);
    try {
      const { checkout_url } = await startUpgrade();
      window.location.href = checkout_url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start checkout");
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      {fromCheckout && !isPro ? (
        <p className="mt-4 rounded-xl border border-teal-400/20 bg-teal-400/5 px-4 py-3 text-sm text-teal-200">
          Payment received — your plan will update here within a couple of minutes.
        </p>
      ) : null}

      {/* account */}
      <section className="mt-8 rounded-2xl border border-white/10 bg-[#161616] p-6">
        <h2 className="text-sm font-semibold text-muted-foreground">Account</h2>
        <p className="mt-2 text-[15px] font-medium">{user?.name}</p>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
      </section>

      {/* plan & credits */}
      <section className="mt-4 rounded-2xl border border-white/10 bg-[#161616] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground">Plan</h2>
            <p className="mt-2 flex items-center gap-2 text-[15px] font-semibold">
              {isPro ? (
                <>
                  <Crown className="size-4 text-amber-300" /> Pro
                </>
              ) : (
                "Free"
              )}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Zap className="size-3.5 text-teal-300" />
              {balance ? `${Math.floor(balance.balance)} credits` : "…"}
            </p>
          </div>
          {!isPro ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void upgrade()}
              className="flex items-center gap-2 rounded-xl bg-teal-400 px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-teal-300 disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Crown className="size-4" />}
              Go Pro — $24/mo
            </button>
          ) : null}
        </div>
        {!isPro ? (
          <ul className="mt-5 grid gap-2 border-t border-white/[0.06] pt-4 sm:grid-cols-2">
            {PRO_PERKS.map((p) => (
              <li key={p} className="flex items-center gap-2 text-sm text-foreground/90">
                <Check className="size-4 shrink-0 text-teal-300" /> {p}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 border-t border-white/[0.06] pt-4 text-sm text-muted-foreground">
            Subscription is managed through Dodo Payments — receipts and management links arrive
            by email. Credits top up automatically each billing cycle.
          </p>
        )}
        {error ? <p className="mt-3 text-xs text-red-400">{error}</p> : null}
      </section>
    </div>
  );
}
