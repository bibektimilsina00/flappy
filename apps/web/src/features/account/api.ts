import { api } from "@/lib/api";

export interface Me {
  id: string;
  email: string;
  name: string;
  auth_provider: string; // password | google | discord
}

export function getMe(): Promise<Me> {
  return api("/users/me");
}

export function updateMe(name: string): Promise<Me> {
  return api("/users/me", { method: "PATCH", body: JSON.stringify({ name }) });
}

export function changePassword(current_password: string, new_password: string): Promise<void> {
  return api("/users/me/password", {
    method: "POST",
    body: JSON.stringify({ current_password, new_password }),
  });
}

export function getSpend(): Promise<{ today: number; week: number; month: number; total: number }> {
  return api("/billing/spend");
}

export interface UsageEntry {
  created_at: string;
  kind: string; // "clips" | node kind
  label: string; // e.g. clips-ingest / clips-select / clips-render / node id
  credits: number;
}

export function getUsage(): Promise<UsageEntry[]> {
  return api("/billing/usage");
}

export function cancelSubscription(): Promise<void> {
  return api("/billing/cancel", { method: "POST" });
}

export interface Workspace {
  id: string;
  name: string;
  plan: string;
  preferences: { clip_defaults?: Record<string, string> } | null;
}

export function getWorkspace(): Promise<Workspace> {
  return api("/workspaces/current");
}

export function updateWorkspace(body: {
  name?: string;
  preferences?: Record<string, unknown>;
}): Promise<Workspace> {
  return api("/workspaces/current", { method: "PATCH", body: JSON.stringify(body) });
}

export interface WorkspaceListItem {
  id: string;
  name: string;
  plan: string;
  role: "owner" | "member";
}

export function listWorkspaces(): Promise<WorkspaceListItem[]> {
  return api("/workspaces");
}

export function createWorkspace(name: string): Promise<Workspace> {
  return api("/workspaces", { method: "POST", body: JSON.stringify({ name }) });
}

export function createInviteLink(): Promise<{ url: string }> {
  return api("/workspaces/current/invite", { method: "POST" });
}

export function joinWorkspace(token: string): Promise<Workspace> {
  return api("/workspaces/join", { method: "POST", body: JSON.stringify({ token }) });
}
