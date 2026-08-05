export interface Transform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
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
  text?: { content: string } & Record<string, unknown>;
  prompt?: string;
  model?: string;
  parentClipId?: string; // this clip is attached to (moves/deletes with) its parent
  linkedClipIds?: string[]; // captions / overlays / voiceover that follow this clip
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
  | "image";
