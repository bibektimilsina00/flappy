import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

interface NavItemProps {
  label: string;
  href: string;
  icon?: LucideIcon;
  active?: boolean;
}

export function NavItem({ label, href, icon: Icon, active }: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors",
        "hover:bg-accent hover:text-foreground",
        active && "bg-accent text-foreground",
      )}
    >
      {Icon ? <Icon className="size-4 shrink-0" /> : null}
      <span className="truncate">{label}</span>
    </Link>
  );
}
