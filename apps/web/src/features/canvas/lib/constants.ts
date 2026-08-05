import {
  AudioLines,
  Globe,
  Image,
  type LucideIcon,
  Music,
  Pencil,
  Sparkles,
  Type,
  Video,
  Wand2,
} from "lucide-react";

export interface NodeAction {
  label: string;
  icon: LucideIcon;
  action?:
    | "write"
    | "add-video"
    | "image-edit"
    | "image-to-video"
    | "video-edit"
    | "video-extend"
    | "text-to-speech"
    | "music-generation";
}

export interface Port {
  id: string;
  label: string;
  icon?: LucideIcon; // falls back to the node icon
  max?: number; // max input connections allowed (default 1)
}

export interface NodeConfig {
  title: string;
  description: string;
  icon: LucideIcon;
  width?: number; // node width in px (default 288)
  inputs: Port[];
  outputs: Port[];
  actions: NodeAction[];
}

// Single source of truth for creatable nodes — used by the toolbar, the
// empty-state quick-start, and the rendered canvas node.
export const NODE_CONFIG = {
  text: {
    title: "Text",
    description: "Notes, prompts, scripts",
    icon: Type,
    inputs: [{ id: "prompt", label: "Prompt", icon: Type }],
    outputs: [{ id: "out", label: "Text", icon: Type }],
    actions: [
      { label: "Write Content", icon: Pencil, action: "write" },
      { label: "Text to Video", icon: Video, action: "add-video" },
      { label: "Optimize Prompt", icon: Sparkles },
    ],
  },
  image: {
    title: "Image",
    description: "Stills, frames, references",
    icon: Image,
    inputs: [
      { id: "prompt", label: "Prompt", icon: Type },
      { id: "image", label: "Image", icon: Image, max: 3 },
    ],
    outputs: [{ id: "out", label: "Image", icon: Image }],
    actions: [
      { label: "Text to Image", icon: Image },
      { label: "Image Edit", icon: Wand2, action: "image-edit" },
    ],
  },
  video: {
    title: "Video",
    description: "Shots, clips, previews",
    icon: Video,
    width: 520,
    inputs: [
      { id: "prompt", label: "Prompt", icon: Type },
      { id: "image", label: "Image", icon: Image, max: 3 },
      { id: "video", label: "Video", icon: Video },
    ],
    outputs: [{ id: "out", label: "Video", icon: Video }],
    actions: [
      { label: "Image to Video", icon: Image, action: "image-to-video" },
      { label: "Video Edit", icon: Wand2, action: "video-edit" },
      { label: "Video Extend", icon: Video, action: "video-extend" },
    ],
  },
  audio: {
    title: "Audio",
    description: "Dialogue, score, SFX",
    icon: AudioLines,
    width: 380,
    inputs: [{ id: "prompt", label: "Prompt", icon: Type }],
    outputs: [{ id: "out", label: "Audio", icon: AudioLines }],
    actions: [
      { label: "Text to Speech", icon: AudioLines, action: "text-to-speech" },
      { label: "Music Generation", icon: Music, action: "music-generation" },
    ],
  },
  world: {
    title: "World",
    description: "3D scenes, Marble worlds",
    icon: Globe,
    inputs: [{ id: "prompt", label: "Prompt", icon: Type }],
    outputs: [{ id: "out", label: "World", icon: Globe }],
    actions: [
      { label: "Generate Scene", icon: Globe },
      { label: "Edit Scene", icon: Wand2 },
    ],
  },
} satisfies Record<string, NodeConfig>;

export type NodeKind = keyof typeof NODE_CONFIG;

// "world" is hidden for now — no real provider backs it (stub only).
export const CREATE_NODE_KINDS = ["text", "image", "video", "audio"] as const;

// A node's OUTPUT type is its kind. Each INPUT handle accepts one type:
const INPUT_TYPE: Record<string, string> = { prompt: "text", image: "image", video: "video" };

export function inputHandleType(id: string): string {
  return INPUT_TYPE[id] ?? id;
}

// Which target handle a connection from `sourceKind` should land on for
// `targetKind`: the dropped handle if its type matches, else the first
// compatible input handle, else null (incompatible → reject the connection).
export function resolveTargetHandle(
  sourceKind: NodeKind,
  targetKind: NodeKind,
  droppedHandle?: string | null,
): string | null {
  const inputs = NODE_CONFIG[targetKind]?.inputs ?? [];
  if (droppedHandle && inputHandleType(droppedHandle) === sourceKind) return droppedHandle;
  return inputs.find((p) => inputHandleType(p.id) === sourceKind)?.id ?? null;
}
