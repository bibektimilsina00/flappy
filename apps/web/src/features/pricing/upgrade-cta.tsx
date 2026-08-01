"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { startUpgrade } from "@/features/billing/services/billing-api";
import { cn } from "@/lib/cn";
import { useSession } from "@/stores/session";

// One click from a pricing card straight to Dodo checkout.
// Logged out -> /login; checkout refused (e.g. already paid) -> /settings.
export function UpgradeCta({
  tier,
  className,
  children,
}: {
  tier: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);

  const go = async () => {
    if (!useSession.getState().token) {
      window.location.href = "/login";
      return;
    }
    setBusy(true);
    try {
      const { checkout_url } = await startUpgrade(tier);
      window.location.href = checkout_url;
    } catch {
      window.location.href = "/settings";
    }
  };

  return (
    <button type="button" disabled={busy} onClick={() => void go()} className={cn(className, busy && "opacity-70")}>
      {busy ? <Loader2 className="size-4 animate-spin" /> : children}
    </button>
  );
}
