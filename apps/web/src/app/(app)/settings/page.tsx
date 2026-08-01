"use client";

import { Crown, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useBalance } from "@/features/billing";
import { useSession } from "@/stores/session";

export default function Page() {
  const user = useSession((s) => s.user);
  const { data: balance, refetch } = useBalance();
  const [fromCheckout, setFromCheckout] = useState(false);
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

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
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

      {/* plan & credits */}
      <section className="mt-4 rounded-2xl border border-white/10 bg-[#161616] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground">Plan</h2>
            <p className="mt-2 flex items-center gap-2 text-[15px] font-semibold capitalize">
              {isPaid ? <Crown className="size-4 text-amber-300" /> : null}
              {plan.replace("_", " ")}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Zap className="size-3.5 text-teal-300" />
              {balance ? `${Math.floor(balance.balance)} credits` : "…"}
            </p>
          </div>
          {!isPaid ? (
            <a
              href="/pricing"
              className="flex items-center gap-2 rounded-xl bg-teal-400 px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-teal-300"
            >
              <Crown className="size-4" /> Upgrade
            </a>
          ) : null}
        </div>
        {isPaid ? (
          <p className="mt-4 border-t border-white/[0.06] pt-4 text-sm text-muted-foreground">
            Subscription is managed through Dodo Payments — receipts and management links arrive
            by email. Credits top up automatically each billing cycle.
          </p>
        ) : null}
      </section>
    </div>
  );
}
