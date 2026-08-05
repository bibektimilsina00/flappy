"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Loader2, PanelLeft, Plus, Send, SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createInviteLink, createWorkspace, listWorkspaces } from "@/features/account/api";
import { cn } from "@/lib/cn";

interface WorkspaceSwitcherProps {
  name: string;
  initial: string;
  collapsed?: boolean;
  onToggle?: () => void;
}

// Switching = set the header workspace + hard reload. A reload is the honest
// reset: every query, draft, and page is scoped to the workspace.
function switchTo(id: string) {
  localStorage.setItem("active-workspace", id);
  window.location.href = "/dashboard";
}

export function WorkspaceSwitcher({ name, initial, collapsed, onToggle }: WorkspaceSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const { data: workspaces } = useQuery({
    queryKey: ["workspaces"],
    queryFn: listWorkspaces,
    enabled: open,
  });
  const activeId =
    typeof window !== "undefined" ? localStorage.getItem("active-workspace") : null;
  const currentId = activeId ?? workspaces?.[0]?.id;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Paid-feature 402s (2nd workspace / invites on free) route to pricing.
  const gate = (e: unknown, fallback: string) => {
    if (e instanceof Error && e.message.includes("paid plan")) window.location.href = "/pricing";
    else toast.error(e instanceof Error ? e.message : fallback);
  };

  const create = useMutation({
    mutationFn: (n: string) => createWorkspace(n),
    onSuccess: (ws) => switchTo(ws.id),
    onError: (e) => gate(e, "Could not create workspace"),
  });

  const invite = useMutation({
    mutationFn: createInviteLink,
    onSuccess: async ({ url }) => {
      await navigator.clipboard.writeText(url);
      toast.success("Invite link copied — valid for 30 days");
      setOpen(false);
    },
    onError: (e) => gate(e, "Could not create invite"),
  });

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 px-2 py-3">
        <button
          type="button"
          onClick={onToggle}
          aria-label="Expand sidebar"
          className="flex size-8 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-blue-600 text-xs font-bold text-white shadow-sm"
        >
          {initial}
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center justify-between px-2 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 hover:bg-accent"
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-blue-600 text-xs font-bold text-white shadow-sm">
            {initial}
          </span>
          <span className="truncate whitespace-nowrap text-xs font-medium">{name}</span>
          <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
        <button
          type="button"
          onClick={onToggle}
          aria-label="Toggle sidebar"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <PanelLeft className="size-4" />
        </button>
      </div>

      {open ? (
        <div className="absolute left-2 top-full z-50 w-64 rounded-xl border border-border bg-[#1c1c1c] p-1.5 shadow-2xl">
          {/* workspace list */}
          <div className="space-y-0.5">
            {(workspaces ?? []).map((w) => {
              const active = w.id === currentId;
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => (active ? setOpen(false) : switchTo(w.id))}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-colors",
                    active ? "bg-white/[0.07]" : "hover:bg-white/[0.04]",
                  )}
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-blue-600 text-xs font-bold text-white shadow-sm">
                    {w.name[0]?.toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{w.name}</span>
                  {w.role === "member" ? (
                    <span className="text-[10px] text-muted-foreground">guest</span>
                  ) : null}
                  {active ? <Check className="size-4 shrink-0 text-teal-300" /> : null}
                </button>
              );
            })}
            {workspaces === undefined ? (
              <div className="grid place-items-center py-3">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : null}
          </div>

          <div className="my-1.5 h-px bg-white/[0.07]" />

          {/* new workspace */}
          {creating ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newName.trim()) create.mutate(newName.trim());
              }}
              className="flex items-center gap-1.5 px-1 py-1"
            >
              {/* biome-ignore lint/a11y/noAutofocus: entering create mode is deliberate */}
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Workspace name"
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#101010] px-2.5 py-1.5 text-sm outline-none focus:border-teal-400/50"
              />
              <button
                type="submit"
                disabled={!newName.trim() || create.isPending}
                className="rounded-lg bg-teal-400 px-2.5 py-1.5 text-xs font-semibold text-black disabled:opacity-40"
              >
                {create.isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Create"}
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
            >
              <Plus className="size-4" /> New workspace
            </button>
          )}

          <div className="my-1.5 h-px bg-white/[0.07]" />

          <button
            type="button"
            disabled={invite.isPending}
            onClick={() => invite.mutate()}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-white/[0.04]"
          >
            {invite.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Invite teammates
          </button>
          <a
            href="/settings/account"
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-white/[0.04]"
          >
            <SlidersHorizontal className="size-4" /> Manage workspace
          </a>
        </div>
      ) : null}
    </div>
  );
}
