"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useUpgrade } from "../hooks/use-upgrade";

export function UpgradeCta({
  tier,
  className,
  children,
}: {
  tier: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { startUpgrade, isUpgrading } = useUpgrade();

  return (
    <button
      type="button"
      disabled={isUpgrading}
      onClick={() => startUpgrade(tier)}
      className={cn(className, isUpgrading && "opacity-70")}
    >
      {isUpgrading ? <Loader2 className="size-4 animate-spin" /> : children}
    </button>
  );
}
