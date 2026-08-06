import { z } from "zod";

export const composerPromptSchema = z.object({
  prompt: z.string().trim().min(1, "Prompt cannot be empty"),
  kind: z.enum(["text", "image", "video", "audio", "world"]),
});
