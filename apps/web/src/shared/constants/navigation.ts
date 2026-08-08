import {
  CircleHelp,
  Clapperboard,
  Component,
  Film,
  Home,
  Images,
  LayoutTemplate,
  type LucideIcon,
  Scissors,
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
  { label: "Editor", icon: Film, href: "/video-editor" },
  { label: "Clips", icon: Scissors, href: "/clips" },
  // Explore + Search hidden for now (features not shipped yet).
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
