import { z } from "zod";

export const clipTransformSchema = z.object({
  x: z.number().finite().default(0),
  y: z.number().finite().default(0),
  scale: z.number().min(0.05).max(10).default(1),
  rotation: z.number().min(-360).max(360).default(0),
  opacity: z.number().min(0).max(1).default(1),
  flipH: z.boolean().optional(),
  flipV: z.boolean().optional(),
  radius: z.number().min(0).max(400).optional(),
  fit: z.enum(["contain", "cover"]).optional(),
  z: z.number().optional(),
});

export const clipTimingSchema = z.object({
  start: z.number().min(0),
  duration: z.number().min(0.05),
  speed: z.number().min(0.1).max(10).default(1),
  in: z.number().min(0).default(0),
  out: z.number().min(0.05),
});

export const aiGenerationSchema = z.object({
  kind: z.enum(["image", "video"]),
  prompt: z.string().trim().min(3, "Prompt must be at least 3 characters").max(1000, "Prompt too long"),
  model: z.string().nullable().optional(),
  source_asset_id: z.string().nullable().optional(),
});

export const publishPostSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120, "Title too long"),
  caption: z.string().max(2000, "Caption too long").optional().default(""),
  account_ids: z.array(z.string()).min(1, "Select at least one account"),
  tiktok_privacy: z.string().optional().default("PUBLIC_TO_EVERYONE"),
});
