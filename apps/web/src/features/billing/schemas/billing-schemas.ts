import { z } from "zod";

export const upgradeTierSchema = z
  .string()
  .trim()
  .min(1, "Subscription tier is required");
