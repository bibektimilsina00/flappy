"use client";

import { useEffect, useState } from "react";
import { useModels } from "@/features/models";
import { useCanvasActions } from "../../../canvas-actions";
import { useUpstreamImages, useUpstreamInputs } from "../../../../hooks/use-upstream-inputs";

export function usePromptBar(nodeId: string, kind: string, initialPrompt = "") {
  const { setNodeData } = useCanvasActions();
  const { data: models } = useModels(kind);

  const [prompt, setPrompt] = useState(initialPrompt);
  const [paramOpen, setParamOpen] = useState(false);

  const upstreamInputs = useUpstreamInputs(nodeId);
  const upstreamImages = useUpstreamImages(nodeId);

  useEffect(() => {
    setPrompt(initialPrompt);
  }, [initialPrompt]);

  const updatePrompt = (text: string) => {
    setPrompt(text);
    setNodeData(nodeId, { prompt: text });
  };

  return {
    models: models ?? [],
    prompt,
    setPrompt: updatePrompt,
    paramOpen,
    setParamOpen,
    upstreamInputs,
    upstreamImages,
  };
}
