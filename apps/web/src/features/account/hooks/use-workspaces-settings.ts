"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createInviteLink,
  createWorkspace,
  getWorkspace,
  listMembers,
  listWorkspaces,
  removeMember,
  updateWorkspace,
} from "../services/account-api";

export function useWorkspacesSettings() {
  const qc = useQueryClient();

  const workspaceQuery = useQuery({
    queryKey: ["workspace"],
    queryFn: getWorkspace,
  });

  const workspacesListQuery = useQuery({
    queryKey: ["workspaces-list"],
    queryFn: listWorkspaces,
  });

  const membersQuery = useQuery({
    queryKey: ["workspace-members"],
    queryFn: listMembers,
  });

  const updateWorkspaceMutation = useMutation({
    mutationFn: (patch: { name?: string; preferences?: Record<string, unknown> }) => updateWorkspace(patch),
    onSuccess: (updated) => {
      qc.setQueryData(["workspace"], updated);
      qc.invalidateQueries({ queryKey: ["workspaces-list"] });
      toast.success("Workspace updated");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update workspace");
    },
  });

  const createWorkspaceMutation = useMutation({
    mutationFn: (name: string) => createWorkspace(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspaces-list"] });
      toast.success("Workspace created");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to create workspace");
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => removeMember(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-members"] });
      toast.success("Member removed");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to remove member");
    },
  });

  const inviteLinkMutation = useMutation({
    mutationFn: createInviteLink,
    onSuccess: (res) => {
      navigator.clipboard.writeText(res.url);
      toast.success("Invite link copied to clipboard");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to generate invite link");
    },
  });

  return {
    workspace: workspaceQuery.data,
    workspaces: workspacesListQuery.data ?? [],
    members: membersQuery.data ?? [],
    updateWorkspace: updateWorkspaceMutation.mutate,
    isUpdatingWorkspace: updateWorkspaceMutation.isPending,
    createWorkspace: createWorkspaceMutation.mutate,
    isCreatingWorkspace: createWorkspaceMutation.isPending,
    removeMember: removeMemberMutation.mutate,
    createInviteLink: inviteLinkMutation.mutate,
    isGeneratingInvite: inviteLinkMutation.isPending,
  };
}
