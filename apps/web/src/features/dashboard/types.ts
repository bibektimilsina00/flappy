import type { NodeKind } from "@/features/canvas";

export interface ComposerState {
  prompt: string;
  kind: NodeKind;
  isSubmitting: boolean;
}
