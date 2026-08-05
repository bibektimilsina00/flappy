import { z } from "zod";

export const profileNameSchema = z.string().trim().min(2, "Name must be at least 2 characters").max(50, "Name cannot exceed 50 characters");

export const changePasswordSchema = z
  .object({
    current: z.string().min(1, "Current password is required"),
    next: z.string().min(8, "New password must be at least 8 characters"),
  })
  .refine((data) => data.current !== data.next, {
    message: "New password must be different from current password",
    path: ["next"],
  });

export const workspaceNameSchema = z.string().trim().min(2, "Workspace name must be at least 2 characters").max(40, "Workspace name cannot exceed 40 characters");

export const clipDefaultsSchema = z.object({
  ratio: z.enum(["9:16", "1:1", "16:9"]).optional(),
  quality: z.enum(["720p", "1080p"]).optional(),
  layout: z.enum(["fit", "fill"]).optional(),
  caption_style: z.enum(["clean", "bold", "highlight", "beast", "neon", "mono"]).optional(),
});
