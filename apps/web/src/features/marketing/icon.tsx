import {
  CircleHelp,
  Clapperboard,
  Compass,
  Component,
  Film,
  Gauge,
  GraduationCap,
  Image as ImageIcon,
  Layers,
  LayoutTemplate,
  Megaphone,
  Music,
  Newspaper,
  Rss,
  Scissors,
  Sparkles,
  Store,
  Tag,
  Users,
  Video,
  Wand2,
  Workflow,
} from "lucide-react";
import type { ComponentType } from "react";

const MAP: Record<string, ComponentType<{ className?: string }>> = {
  Workflow,
  Clapperboard,
  Sparkles,
  Layers,
  Wand2,
  Gauge,
  Megaphone,
  Music,
  GraduationCap,
  Store,
  Newspaper,
  Video,
  Component,
  LayoutTemplate,
  Tag,
  Image: ImageIcon,
  Film,
  Rss,
  Scissors,
  Compass,
  CircleHelp,
  Users,
};

export function Icon({ name, className }: { name: string; className?: string }) {
  const Cmp = MAP[name] ?? Sparkles;
  return <Cmp className={className} />;
}
