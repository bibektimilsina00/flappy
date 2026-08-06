import { z } from "zod";

export const communitySearchSchema = z.object({
  query: z.string().trim().optional(),
  category: z.enum(["all", "short film", "commercial", "vfx", "animation"]).default("all"),
});
