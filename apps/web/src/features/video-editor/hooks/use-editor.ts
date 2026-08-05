"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { VideoEditorDoc } from "../types";
import { useEditorProject } from "./use-editor-project";

/**
 * Editor project + edit history. `commit` = one discrete undo step; a drag uses
 * startGesture()/preview()/endGesture() so intermediate frames don't spam history.
 */
export function useEditor(workflowId: string) {
  const { project, assets, setDoc, setTitle, saveState } = useEditorProject(workflowId);
  const doc = project?.doc ?? null;
  const [past, setPast] = useState<VideoEditorDoc[]>([]);
  const [future, setFuture] = useState<VideoEditorDoc[]>([]);
  const gestureBase = useRef<VideoEditorDoc | null>(null);

  const commit = useCallback(
    (next: VideoEditorDoc) => {
      setPast((p) => (doc ? [...p, doc].slice(-60) : p));
      setFuture([]);
      setDoc(next);
    },
    [doc, setDoc],
  );

  const startGesture = useCallback(() => {
    gestureBase.current = doc;
  }, [doc]);
  const preview = setDoc; // transient, no history
  const endGesture = useCallback((changed = true) => {
    const base = gestureBase.current;
    gestureBase.current = null;
    if (base && changed) {
      setPast((p) => [...p, base].slice(-60));
      setFuture([]);
    }
  }, []);

  const undo = useCallback(() => {
    setPast((p) => {
      if (!p.length || !doc) return p;
      setFuture((f) => [doc, ...f].slice(0, 60));
      setDoc(p[p.length - 1]);
      return p.slice(0, -1);
    });
  }, [doc, setDoc]);
  const redo = useCallback(() => {
    setFuture((f) => {
      if (!f.length || !doc) return f;
      setPast((p) => [...p, doc].slice(-60));
      setDoc(f[0]);
      return f.slice(1);
    });
  }, [doc, setDoc]);

  // Reset history when the project id changes (fresh load).
  const pid = project?.id;
  useEffect(() => {
    setPast([]);
    setFuture([]);
  }, [pid]);

  return {
    project,
    assets,
    doc,
    setTitle,
    saveState,
    commit,
    startGesture,
    preview,
    endGesture,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}
