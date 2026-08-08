import { z } from "zod";

export const clipsParamsSchema = z.object({
  layout: z.enum(["fit", "fill", "blur"]).optional(),
  goal: z.enum(["Viral Short", "Highlights", "Insights", "Split Evenly"]).optional(),
  split_interval_sec: z.number().min(5).max(3600).optional(),
  count: z.union([z.number().min(1).max(20), z.literal("auto")]),
  duration: z.union([z.literal("auto"), z.array(z.string())]),
  ratio: z.enum(["9:16", "1:1", "16:9"]),
  focus: z.string().optional(),
  captions: z.boolean(),
  caption_style: z.string(),
  add_emojis: z.boolean(),
  highlight_keywords: z.boolean(),
  censor: z.boolean(),
});

export const sourceUrlSchema = z
  .string()
  .trim()
  .url("Please enter a valid video URL (YouTube, Vimeo, etc.)");
