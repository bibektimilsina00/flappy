import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

interface NavItemProps {
  label: string;
  href: string;
  icon?: LucideIcon;
  active?: boolean;
  collapsed?: boolean;
}

export function NavItem({ label, href, icon: Icon, active, collapsed }: NavItemProps) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md py-2 text-sm text-muted-foreground transition-all duration-150",
        "hover:bg-white/5 hover:text-white",
        active && "bg-white/[0.08] text-white font-semibold shadow-sm border-l-2 border-teal-400",
        collapsed ? "justify-center px-0" : "px-3",
      )}
    >
      {Icon ? <Icon className={cn("size-4 shrink-0", active && "text-teal-400")} /> : null}
      {collapsed ? null : <span className="truncate">{label}</span>}
    </Link>
  );
}
