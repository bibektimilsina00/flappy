"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History, Loader2, RotateCcw, Save, X } from "lucide-react";
import type { VideoEditorDoc } from "../../types";
import { listVersions, restoreVersion, saveVersion } from "../../services/video-editor-api";

const ACCENT = "#14b8a6";

// Version history — snapshot the current doc and restore any past snapshot.
export function VersionHistory({
  open,
  onClose,
  projectId,
  doc,
  onRestore,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  doc: VideoEditorDoc | null;
  onRestore: (doc: VideoEditorDoc) => void;
}) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["versions", projectId], queryFn: () => listVersions(projectId), enabled: open });

  const save = useMutation({
    mutationFn: () => saveVersion(projectId, doc),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["versions", projectId] }),
  });
  const restore = useMutation({
    mutationFn: (id: string) => restoreVersion(projectId, id),
    onSuccess: (res) => {
      onRestore(res.doc as VideoEditorDoc);
      onClose();
    },
  });

  if (!open) return null;
  const versions = data?.versions ?? [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <section className="relative flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <History className="size-4 text-muted-foreground" />
          <h2 className="flex-1 text-base font-semibold">Version History</h2>
          <button type="button" onClick={onClose} className="grid size-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>

        <div className="border-b border-border p-3">
          <button
            type="button"
            onClick={() => save.mutate()}
            disabled={save.isPending || !doc}
            className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: ACCENT }}
          >
            {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save current version
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 [scrollbar-width:thin]">
          {isLoading ? (
            <div className="grid place-items-center py-10 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : versions.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No versions yet — save one to start a history.</p>
          ) : (
            <div className="space-y-1">
              {versions.map((v) => (
                <div key={v.id} className="flex items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-accent">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{v.label || fmt(v.ts)}</p>
                    {v.label ? <p className="truncate text-[11px] text-muted-foreground">{fmt(v.ts)}</p> : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => restore.mutate(v.id)}
                    disabled={restore.isPending}
                    className="flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-50"
                  >
                    <RotateCcw className="size-3.5" /> Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function fmt(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
