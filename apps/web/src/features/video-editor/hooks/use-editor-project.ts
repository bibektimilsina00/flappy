"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { getEditorProject, saveEditorProject } from "../services/video-editor-api";
import type { VideoEditorDoc, VideoEditorProject } from "../types";

type SaveState = "idle" | "saving" | "saved";
const keyFor = (id: string) => ["editor-project", id];

/**
 * Loads the editor project for a workflow (seeded server-side on first open) and
 * debounce-autosaves doc/title changes. The initial load goes through the react-query
 * cache and we keep that cache in sync on save/unmount — so flipping between the
 * Workflow and Video tabs re-shows the project instantly, with no re-fetch spinner.
 */
export function useEditorProject(workflowId: string) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: keyFor(workflowId),
    queryFn: () => getEditorProject(workflowId),
    staleTime: 5 * 60_000,
  });

  const [project, setProject] = useState<VideoEditorProject | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const firstRun = useRef(true);
  // Newest not-yet-persisted payload so we can flush it if the editor unmounts mid-debounce.
  const pending = useRef<{ title?: string; doc: VideoEditorDoc } | null>(null);
  const latest = useRef<VideoEditorProject | null>(null);
  latest.current = project;

  // Seed editable state from the (possibly cached) fetch — once per project.
  useEffect(() => {
    if (data && (!latest.current || latest.current.id !== data.id)) {
      firstRun.current = true;
      setProject(data);
    }
  }, [data]);

  // Debounced autosave when the doc or title changes.
  const title = project?.title;
  const doc = project?.doc;
  const projectId = project?.id;
  useEffect(() => {
    if (!projectId || !doc) return;
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setSaveState("saving");
    pending.current = { title, doc };
    const timer = setTimeout(() => {
      saveEditorProject(projectId, { title, doc })
        .then(() => {
          pending.current = null;
          setSaveState("saved");
          if (latest.current) qc.setQueryData(keyFor(workflowId), latest.current);
        })
        .catch(() => setSaveState("idle"));
    }, 900);
    return () => clearTimeout(timer);
  }, [projectId, title, doc, qc, workflowId]);

  // On unmount: flush any pending edit and refresh the cache so a switch-back is seamless.
  useEffect(() => {
    return () => {
      if (!projectId) return;
      if (pending.current) saveEditorProject(projectId, pending.current).catch(() => {});
      if (latest.current) qc.setQueryData(keyFor(workflowId), latest.current);
    };
  }, [projectId, qc, workflowId]);

  const setDoc = useCallback((next: VideoEditorDoc) => {
    setProject((p) => (p ? { ...p, doc: next } : p));
  }, []);
  const setTitle = useCallback((next: string) => {
    setProject((p) => (p ? { ...p, title: next } : p));
  }, []);

  // Assets come straight from the (revalidatable) query so an editor upload shows up
  // as soon as the query is invalidated — the local `project` only owns doc/title.
  const assets = data?.assets ?? project?.assets ?? [];

  return { project, assets, setDoc, setTitle, saveState };
}
