import {
  CircleHelp,
  Clapperboard,
  Compass,
  Component,
  Home,
  Images,
  LayoutTemplate,
  type LucideIcon,
  Search,
  Settings,
} from "lucide-react";

export interface NavItemDef {
  label: string;
  icon: LucideIcon;
  href: string;
}

export const PRIMARY_NAV: NavItemDef[] = [
  { label: "Home", icon: Home, href: "/dashboard" },
  { label: "Canvas", icon: Component, href: "/canvas" },
  { label: "Explore", icon: Compass, href: "/explore" },
  { label: "Search", icon: Search, href: "/search" },
];

export const LIBRARY_NAV: NavItemDef[] = [
  { label: "Projects", icon: Clapperboard, href: "/projects" },
  { label: "Assets", icon: Images, href: "/assets" },
  { label: "Templates", icon: LayoutTemplate, href: "/templates" },
];

export const FOOTER_NAV: NavItemDef[] = [
  { label: "Help", icon: CircleHelp, href: "/help" },
  { label: "Settings", icon: Settings, href: "/settings" },
];
