import { z } from "zod";

export const collectionNameSchema = z
  .string()
  .trim()
  .min(1, "Collection name cannot be empty")
  .max(50, "Collection name cannot exceed 50 characters");

export const assetSearchSchema = z.string().trim().max(100, "Search query too long").optional();
