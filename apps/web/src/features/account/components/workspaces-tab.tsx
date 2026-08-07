"use client";

import { Check, Loader2, Plus, Send } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { useAccountSettings } from "../hooks/use-account-settings";
import { useWorkspacesSettings } from "../hooks/use-workspaces-settings";
import { Row, SectionLabel, inputCls } from "./settings-primitives";

export function WorkspacesTab() {
  const { me } = useAccountSettings();
  const {
    workspace: current,
    workspaces,
    members,
    updateWorkspace,
    isUpdatingWorkspace,
    createWorkspace,
    isCreatingWorkspace,
    removeMember,
    createInviteLink,
    isGeneratingInvite,
  } = useWorkspacesSettings();

  const activeId =
    (typeof window !== "undefined" ? localStorage.getItem("active-workspace") : null) ??
    current?.id;
  const isOwner = current !== undefined && me !== undefined && members?.[0]?.user_id === me.id;

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const [name, setName] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const shownName = name ?? current?.name ?? "";
  const nameDirty = current !== undefined && shownName.trim() !== current.name;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    createWorkspace(newName.trim(), {
      onSuccess: (w) => {
        localStorage.setItem("active-workspace", w.id);
        window.location.reload();
      },
    });
  };

  const handleRename = () => {
    updateWorkspace(
      { name: shownName.trim() },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        },
      },
    );
  };

  return (
    <div>
      <SectionLabel>Your workspaces</SectionLabel>
      {(workspaces ?? []).map((w) => (
        <Row
          key={w.id}
          label={w.name}
          hint={`${w.plan === "free" ? "Free" : w.plan.replace("_", " ")} plan · ${w.role}`}
        >
          {w.id === activeId ? (
            <span className="flex items-center gap-1.5 text-sm text-teal-300">
              <Check className="size-4" /> Current
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                localStorage.setItem("active-workspace", w.id);
                window.location.reload();
              }}
              className="rounded-lg border border-white/15 px-3.5 py-1.5 text-xs font-medium transition-colors hover:bg-white/5"
            >
              Switch
            </button>
          )}
        </Row>
      ))}

      {creating ? (
        <form onSubmit={handleCreate} className="flex items-center gap-2 py-3">
          {/* biome-ignore lint/a11y/noAutofocus: entering create mode is deliberate */}
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Workspace name"
            className={cn(inputCls, "w-64")}
          />
          <button
            type="submit"
            disabled={!newName.trim() || isCreatingWorkspace}
            className="rounded-lg bg-teal-400 px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {isCreatingWorkspace ? <Loader2 className="size-4 animate-spin" /> : "Create"}
          </button>
        </form>
      ) : (
        <div className="py-3">
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 rounded-lg border border-white/15 px-3.5 py-2 text-sm font-medium transition-colors hover:bg-white/5"
          >
            <Plus className="size-4" /> New workspace
          </button>
        </div>
      )}

      <SectionLabel>Current workspace</SectionLabel>
      <Row label="Name" hint="Shown in the sidebar and to invited teammates">
        <div className="flex gap-2">
          <input
            value={shownName}
            onChange={(e) => setName(e.target.value)}
            className={cn(inputCls, "w-56")}
          />
          <button
            type="button"
            disabled={!nameDirty || isUpdatingWorkspace}
            onClick={handleRename}
            className="rounded-lg bg-teal-400 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-teal-300 disabled:opacity-40"
          >
            {isUpdatingWorkspace ? <Loader2 className="size-4 animate-spin" /> : saved ? <Check className="size-4" /> : "Save"}
          </button>
        </div>
      </Row>

      <SectionLabel>Members</SectionLabel>
      {(members ?? []).map((m) => (
        <Row key={m.user_id} label={m.name} hint={m.email}>
          {m.role === "owner" ? (
            <span className="text-xs text-muted-foreground">Owner</span>
          ) : isOwner ? (
            <button
              type="button"
              onClick={() => removeMember(m.user_id)}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-red-400/40 hover:text-red-400"
            >
              Remove
            </button>
          ) : (
            <span className="text-xs text-muted-foreground">Member</span>
          )}
        </Row>
      ))}
      {isOwner ? (
        <div className="py-3">
          <button
            type="button"
            disabled={isGeneratingInvite}
            onClick={() => createInviteLink()}
            className="flex items-center gap-2 rounded-lg border border-white/15 px-3.5 py-2 text-sm font-medium transition-colors hover:bg-white/5"
          >
            {isGeneratingInvite ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Invite teammates
          </button>
        </div>
      ) : null}
    </div>
  );
}
