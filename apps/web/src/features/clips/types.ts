export interface ClipItem {
  id: string;
  title: string;
  score: number;
  reason: string;
  start: number;
  end: number;
  duration: number;
  key: string;
  url: string | null;
  status?: "ready" | "rendering" | "failed";
  clean?: boolean;
  error?: string;
  caption_edits?: { start: number; end: number; text: string }[] | null;
  is_expired?: boolean;
  expired_reason?: string;
}

export interface TranscriptSegment {
  text: string;
  start: number;
  end: number;
  words?: { w: string; s: number; e: number; hl?: boolean }[];
}

export interface ClipsJob {
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  phase: "ingest" | "transcribe" | "select" | "render";
  progress: number;
  error: string | null;
  source_url: string | null;
  source_title: string | null;
  source_thumb_url: string | null;
  workflow_id: string | null;
  params: Record<string, unknown>;
  duration: number | null;
  created_at: string;
  phase_started_at: string | null;
  plan?: string;
  is_free_plan?: boolean;
  expires_at?: string | null;
  hard_deletes_at?: string | null;
  retention_status?: "active" | "expired" | "hard_deleted";
  days_remaining?: number;
  is_expired?: boolean;
  is_hard_deleted?: boolean;
  clips: ClipItem[];
  transcript?: TranscriptSegment[];
  source_media_url?: string | null;
}

export interface CustomCaptionStyle {
  name: string;
  color: string;
  highlight: string;
  size: "s" | "m" | "l";
  bold: boolean;
  uppercase: boolean;
  box: boolean;
  position: "bottom" | "middle";
  headline?: { enabled: boolean; bg: string; color: string };
  layout?: "auto" | "fill" | "fit";
  font?: "inter" | "poppins" | "anton" | "bangers";
  size_px?: number;
  align?: "left" | "center" | "right";
  italic?: boolean;
  underline?: boolean;
  spacing?: number;
  words_per_line?: number;
  shadow?: boolean;
  stroke?: { width: number; color: string };
  box_color?: string;
  bg?: string;
  logo?: string | null;
  subtitles?: boolean;
}

export interface ScheduleConfig {
  enabled: boolean;
  account_ids?: string[];
  min_score: number | null;
  per_day: number;
  mode: "all" | "days";
  days: number;
  start_date: string;
  window_start: string;
  window_end: string;
  tz: string;
}

export interface ScheduledPost {
  id: string;
  job_id: string;
  clip_id: string;
  title: string | null;
  post_at: string;
  status: "scheduled" | "due" | "posting" | "posted" | "failed";
  platform: string | null;
  account: string | null;
  result_url: string | null;
  error: string | null;
  score: number | null;
  url: string | null;
}

export interface SocialAccount {
  id: string;
  platform: string;
  username: string | null;
  avatar_url: string | null;
}

export type ClipsGoal = "Viral Short" | "Highlights" | "Insights" | "Split Evenly";

export interface ClipsParams {
  layout?: "fit" | "fill" | "blur";
  goal?: ClipsGoal;
  // Split Evenly only: fixed clip length in seconds to chop the whole
  // video into consecutive, non-overlapping clips (last clip may be shorter).
  split_interval_sec?: number;
  count: number | "auto";
  duration: "auto" | string[];
  ratio: "9:16" | "1:1" | "16:9";
  focus?: string;
  captions: boolean;
  caption_style: string;
  caption_custom?: CustomCaptionStyle | null;
  add_emojis: boolean;
  highlight_keywords: boolean;
  censor: boolean;
  headline?: { enabled: boolean; bg: string; color: string; text?: string };
  // Paid only. Off by default (watermark kept); true = clean export. Free plans
  // always get the watermark regardless.
  remove_watermark?: boolean;
  schedule?: ScheduleConfig;
}

export interface TikTokCreatorInfo {
  privacy_level_options: string[];
  comment_disabled: boolean;
  duet_disabled: boolean;
  stitch_disabled: boolean;
  max_video_post_duration_sec: number | null;
}

export interface PublishResult {
  id: string;
  clip_id: string;
  status: string;
  platform: string | null;
  account: string | null;
  result_url: string | null;
  error: string | null;
}
