import { useState } from "react";
import { toast } from "sonner";
import { composerPromptSchema } from "../schemas/dashboard-schemas";
import type { NodeKind } from "@/features/canvas";

export function useComposer(onSubmit?: (value: string) => void) {
  const [value, setValue] = useState("");

  const submit = (kind: NodeKind = "video") => {
    const text = value.trim();
    const result = composerPromptSchema.safeParse({ prompt: text, kind });
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? "Please enter a valid prompt");
      return;
    }
    onSubmit?.(text);
    setValue("");
  };

  return { value, setValue, submit };
}
