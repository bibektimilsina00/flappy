export interface Transform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  flipH?: boolean;
  flipV?: boolean;
  radius?: number; // corner radius in px
  fit?: "contain" | "cover"; // how the media sits in the frame (default contain)
  z?: number; // stacking override (defaults to the clip's track order)
}

export interface Clip {
  id: string;
  assetId?: string;
  kind: string; // video | image | text | audio | effect
  start: number; // timeline position (s)
  duration: number; // on-timeline length (s)
  in: number; // source trim in (s)
  out: number; // source trim out (s)
  speed: number;
  volume: number;
  transform: Transform;
  keyframes: unknown[];
  effects: unknown[];
  text?: {
    content: string;
    fontFamily?: string;
    fontSize?: number; // in document px
    color?: string;
    bold?: boolean;
    italic?: boolean;
    align?: "left" | "center" | "right";
    lineHeight?: number; // multiplier (default 1.2)
    letterSpacing?: number; // in document px (default 0)
  } & Record<string, unknown>;
  shape?: { type: "rect" | "rounded" | "ellipse" | "triangle" | "star"; color: string };
  prompt?: string;
  model?: string;
  parentClipId?: string; // this clip is attached to (moves/deletes with) its parent
  linkedClipIds?: string[]; // captions / overlays / voiceover that follow this clip
  animations?: Record<string, string>; // animation tab (in/out/loop/zoom) -> preset id
  transition?: string; // transition preset id applied at the clip boundary
}

export interface Track {
  id: string;
  kind: string; // video | image | text | audio | effect
  name: string;
  locked: boolean;
  hidden: boolean;
  muted: boolean;
  magnetic?: boolean; // default true — clips stay gap-free & ripple. false = free/overlay track.
  clips: Clip[];
}

export interface VideoEditorDoc {
  version: number;
  fps: number;
  width: number;
  height: number;
  duration: number;
  background: string;
  tracks: Track[];
  markers: unknown[];
}

export interface VideoEditorAsset {
  id: string;
  kind: string;
  url: string;
}

export interface VideoEditorProject {
  id: string;
  title: string;
  doc: VideoEditorDoc;
  assets: VideoEditorAsset[];
  share?: { review: string | null; presentation: string | null };
}

export type CategoryId =
  | "ai-tools"
  | "ai-gen"
  | "assistant"
  | "media"
  | "text"
  | "subtitles"
  | "audio"
  | "effects"
  | "transitions"
  | "video"
  | "image"
  | "elements"
  | "brand";
