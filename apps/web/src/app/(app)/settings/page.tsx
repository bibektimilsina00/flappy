"use client";

import { Check, Crown, Loader2, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useBalance } from "@/features/billing";
import { startUpgrade } from "@/features/billing/services/billing-api";
import { STUDIO_SIZES } from "@/features/pricing/plans";
import { useSession } from "@/stores/session";

const TIERS: {
  id: "plus" | "pro" | "ultra";
  name: string;
  price: string;
  credits: string;
  perks: string[];
  highlight?: boolean;
}[] = [
  {
    id: "plus",
    name: "Plus",
    price: "$12/mo",
    credits: "1,200 credits/mo",
    perks: ["YouTube link import", "Video generation", "1-hour sources", "1080p, no watermark"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$28/mo",
    credits: "3,200 credits/mo",
    perks: ["Everything in Plus", "Premium models", "2-hour sources", "Auto-schedule & publishing"],
    highlight: true,
  },
  {
    id: "ultra",
    name: "Ultra",
    price: "$76/mo",
    credits: "10,000 credits/mo",
    perks: ["Everything in Pro", "Highest priority", "Early access to new models"],
  },
];

export default function Page() {
  const user = useSession((s) => s.user);
  const { data: balance, refetch } = useBalance();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fromCheckout, setFromCheckout] = useState(false);
  const [studioSize, setStudioSize] = useState(0);
  const plan = balance?.plan ?? "free";
  const isPaid = plan !== "free";

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

  const upgrade = async (tier: string) => {
    setBusy(tier);
    setError(null);
    try {
      const { checkout_url } = await startUpgrade(tier);
      window.location.href = checkout_url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start checkout");
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      {fromCheckout && !isPaid ? (
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

      {/* current plan */}
      <section className="mt-4 rounded-2xl border border-white/10 bg-[#161616] p-6">
        <h2 className="text-sm font-semibold text-muted-foreground">Plan</h2>
        <p className="mt-2 flex items-center gap-2 text-[15px] font-semibold capitalize">
          {isPaid ? <Crown className="size-4 text-amber-300" /> : null}
          {plan}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Zap className="size-3.5 text-teal-300" />
          {balance ? `${Math.floor(balance.balance)} credits` : "…"}
        </p>
        {isPaid ? (
          <p className="mt-4 border-t border-white/[0.06] pt-4 text-sm text-muted-foreground">
            Subscription is managed through Dodo Payments — receipts and management links arrive
            by email. Credits top up automatically each billing cycle.
          </p>
        ) : null}
      </section>

      {/* upgrade tiers */}
      {!isPaid ? (
        <>
        <section className="mt-4 grid gap-3 sm:grid-cols-3">
          {TIERS.map((t) => (
            <div
              key={t.id}
              className={
                t.highlight
                  ? "rounded-2xl border border-teal-400/50 bg-[#161616] p-5 shadow-[0_0_24px_-10px_rgba(45,212,191,0.5)]"
                  : "rounded-2xl border border-white/10 bg-[#161616] p-5"
              }
            >
              <p className="flex items-baseline justify-between">
                <span className="font-semibold">{t.name}</span>
                <span className="text-sm text-muted-foreground">{t.price}</span>
              </p>
              <p className="mt-1 text-xs text-teal-300">{t.credits}</p>
              <ul className="mt-3 space-y-1.5">
                {t.perks.map((p) => (
                  <li key={p} className="flex items-center gap-1.5 text-xs text-foreground/85">
                    <Check className="size-3 shrink-0 text-teal-300" /> {p}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void upgrade(t.id)}
                className={
                  t.highlight
                    ? "mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-400 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-teal-300 disabled:opacity-60"
                    : "mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold transition-colors hover:bg-white/5 disabled:opacity-60"
                }
              >
                {busy === t.id ? <Loader2 className="size-4 animate-spin" /> : null}
                Get {t.name}
              </button>
            </div>
          ))}
        </section>

        {/* Studio — sized volume tier */}
        <section className="mt-3 rounded-2xl border border-white/10 bg-[#161616] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-semibold">
                Studio{" "}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  ${(140 * STUDIO_SIZES[studioSize].mult).toLocaleString()}/mo
                </span>
              </p>
              <p className="mt-0.5 text-xs text-teal-300">
                {(20000 * STUDIO_SIZES[studioSize].mult).toLocaleString()} credits/mo · everything
                in Pro · invoice & dedicated support
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/30 p-1">
              {STUDIO_SIZES.map((s, i) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => setStudioSize(i)}
                  className={
                    i === studioSize
                      ? "rounded-full bg-teal-400 px-3 py-1 text-xs font-semibold text-black"
                      : "rounded-full px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                  }
                >
                  {s.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void upgrade(`studio_${STUDIO_SIZES[studioSize].label.toLowerCase()}`)}
              className="flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold transition-colors hover:bg-white/5 disabled:opacity-60"
            >
              {busy?.startsWith("studio") ? <Loader2 className="size-4 animate-spin" /> : null}
              Get Studio {STUDIO_SIZES[studioSize].label}
            </button>
          </div>
        </section>
        </>
      ) : null}
      {error ? <p className="mt-3 text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
