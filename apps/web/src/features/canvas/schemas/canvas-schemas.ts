import { z } from "zod";

export const nodeKindSchema = z.enum(["text", "image", "video", "audio", "world"]);

export const promptSchema = z
  .string()
  .trim()
  .max(4000, "Prompt text is too long");
