"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutTemplate, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteTemplate, listTemplates, useTemplate } from "@/features/video-editor";

export default function Page() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["templates"], queryFn: listTemplates });

  const use = useMutation({
    mutationFn: (id: string) => useTemplate(id),
    onSuccess: ({ workflow_id }) => router.push(`/video-editor?project=${workflow_id}`),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't open template"),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't delete template"),
  });

  const templates = data?.templates ?? [];

  return (
    <div className="mx-auto w-full max-w-5xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Templates</h1>
        <p className="text-sm text-muted-foreground">Start a new project from one of your saved templates.</p>
      </header>

      {isLoading ? (
        <div className="grid place-items-center py-20 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <div className="grid place-items-center gap-3 rounded-2xl border border-dashed border-border py-20 text-center">
          <div className="grid size-12 place-items-center rounded-2xl bg-teal-500/10 text-teal-500">
            <LayoutTemplate className="size-6" />
          </div>
          <p className="text-sm font-medium">No templates yet</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            In the video editor, open the project menu (⋯) and choose <span className="font-medium">Save as Template</span> to reuse an edit.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <div key={t.id} className="group flex flex-col rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-teal-500/40">
              <div className="mb-3 grid aspect-video place-items-center rounded-lg bg-secondary text-muted-foreground">
                <LayoutTemplate className="size-7" />
              </div>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{t.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t.clips} clip{t.clips === 1 ? "" : "s"} · {fmt(t.ts)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove.mutate(t.id)}
                  disabled={remove.isPending}
                  className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-red-500 group-hover:opacity-100 disabled:opacity-50"
                  aria-label="Delete template"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => use.mutate(t.id)}
                disabled={use.isPending}
                className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-teal-500 py-2 text-sm font-semibold text-black transition-colors hover:bg-teal-600 disabled:opacity-50"
              >
                {use.isPending && use.variables === t.id ? <Loader2 className="size-4 animate-spin" /> : null}
                Use template
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function fmt(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
