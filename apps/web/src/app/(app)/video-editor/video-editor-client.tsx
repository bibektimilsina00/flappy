"use client";

import { useQuery } from "@tanstack/react-query";
import { Film, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createWorkflow, listWorkflows, type Workflow } from "@/features/projects";
import { VideoEditorPage } from "@/features/video-editor";
import { Button } from "@/components/ui/button";

export function VideoEditorRouteClient({ initialProjectId }: { initialProjectId?: string }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const { data: workflows, isLoading } = useQuery({
    queryKey: ["workflows"],
    queryFn: listWorkflows,
    enabled: !initialProjectId,
  });

  if (initialProjectId) {
    return <VideoEditorPage projectId={initialProjectId} />;
  }

  if (isLoading || creating) {
    return (
      <div className="grid h-full w-full place-items-center bg-background text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-teal-500" />
          <p className="text-sm font-medium">Opening Video Editor…</p>
        </div>
      </div>
    );
  }

  // If user has existing workflows, auto-open the latest one, else show create project screen
  if (workflows && workflows.length > 0) {
    const latest = workflows[0];
    if (latest?.id) {
      router.replace(`/video-editor?project=${latest.id}`);
      return (
        <div className="grid h-full w-full place-items-center bg-background text-muted-foreground">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-teal-500" />
            <p className="text-sm font-medium">Opening latest project…</p>
          </div>
        </div>
      );
    }
  }

  const handleCreateNew = async () => {
    setCreating(true);
    try {
      const newWf = await createWorkflow("New Video Project");
      router.replace(`/video-editor?project=${newWf.id}`);
    } catch {
      setCreating(false);
    }
  };

  return (
    <div className="grid h-full w-full place-items-center bg-background p-6">
      <div className="flex max-w-md flex-col items-center text-center space-y-4 rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="grid size-12 place-items-center rounded-2xl bg-teal-500/10 text-teal-500">
          <Film className="size-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold">Video Editor</h2>
          <p className="text-xs text-muted-foreground">
            Create multi-track video edits, add voiceovers, captions, and export high-resolution video.
          </p>
        </div>
        <Button onClick={handleCreateNew} disabled={creating} className="w-full gap-2 bg-teal-500 hover:bg-teal-600 text-white font-semibold">
          <Plus className="size-4" />
          Create New Video Project
        </Button>
      </div>
    </div>
  );
}
