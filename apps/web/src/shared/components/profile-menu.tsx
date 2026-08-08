"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { ChevronDown, CreditCard, LifeBuoy, LogOut, Settings, Sparkles } from "lucide-react";
import Link from "next/link";
import posthog from "posthog-js";
import { useEffect, useRef, useState } from "react";
import { openUpgrade, useBalance } from "@/features/billing";
import { cn } from "@/lib/cn";

const formatPlan = (plan: string) =>
  plan === "free" ? "Free" : plan.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// Header avatar + dropdown: identity, credit balance, upgrade, and account links.
export function ProfileMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { data: balance } = useBalance();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const plan = balance?.plan ?? "free";
  const isPaid = plan !== "free";
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name = user?.fullName || email.split("@")[0] || "Account";
  const initial = (user?.firstName?.[0] ?? email[0] ?? "U").toUpperCase();

  const links = [
    { href: "/settings/account", label: "Settings", icon: Settings },
    { href: "/settings/billing", label: "Billing", icon: CreditCard },
    { href: "/help", label: "Help & support", icon: LifeBuoy },
  ];

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        className="flex items-center gap-1.5 rounded-full p-0.5 pr-1.5 transition-colors hover:bg-white/[0.06]"
      >
        <Avatar initial={initial} image={user?.imageUrl} />
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 origin-top-right animate-in overflow-hidden rounded-xl border border-white/10 bg-[#1c1c1c] shadow-2xl shadow-black/50 duration-150 fade-in-0 zoom-in-95">
          {/* identity */}
          <div className="flex items-center gap-3 border-b border-white/[0.06] p-3.5">
            <Avatar initial={initial} image={user?.imageUrl} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{name}</p>
              {email ? <p className="truncate text-xs text-muted-foreground">{email}</p> : null}
            </div>
          </div>

          {/* credits + plan */}
          <div className="p-2">
            <div className="rounded-lg bg-white/[0.03] p-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Sparkles className="size-3.5 text-teal-300" /> Credits
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    isPaid ? "bg-teal-400/15 text-teal-300" : "bg-white/10 text-muted-foreground",
                  )}
                >
                  {formatPlan(plan)}
                </span>
              </div>
              <p className="mt-1.5 text-2xl font-bold tabular-nums text-foreground">
                {balance ? balance.balance.toLocaleString() : "—"}
              </p>
              {!isPaid ? (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    openUpgrade("Upgrade your plan");
                  }}
                  className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#14b8a6] py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0f9c8c]"
                >
                  <Sparkles className="size-4" /> Upgrade plan
                </button>
              ) : null}
            </div>
          </div>

          {/* links */}
          <div className="p-1.5 pt-0">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-foreground/90 transition-colors hover:bg-white/[0.05]"
              >
                <Icon className="size-4 text-muted-foreground" /> {label}
              </Link>
            ))}
            <div className="my-1 h-px bg-white/[0.06]" />
            <button
              type="button"
              onClick={() => {
                posthog.reset(); // unlink analytics identity before the next user signs in
                signOut({ redirectUrl: "/login" });
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
            >
              <LogOut className="size-4" /> Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Avatar({ initial, image, size = "sm" }: { initial: string; image?: string; size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "size-10 text-base" : "size-8 text-sm";
  if (image) {
    // biome-ignore lint/nursery/noImgElement: Clerk-hosted avatar, next/image not needed
    return <img src={image} alt="" className={cn("shrink-0 rounded-full object-cover", cls)} />;
  }
  return (
    <span className={cn("grid shrink-0 place-items-center rounded-full bg-[#14b8a6] font-bold text-white", cls)}>
      {initial}
    </span>
  );
}
