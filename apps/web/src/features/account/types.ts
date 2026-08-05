export interface Me {
  id: string;
  email: string;
  name: string;
  auth_provider: string; // password | google | discord
  avatar_url?: string | null;
}

export interface UsageEntry {
  created_at: string;
  kind: string; // "clips" | node kind
  label: string; // e.g. clips-ingest / clips-select / clips-render / node id
  credits: number;
}

export interface Workspace {
  id: string;
  name: string;
  plan: string;
  preferences: { clip_defaults?: Record<string, string> } | null;
}

export interface WorkspaceListItem {
  id: string;
  name: string;
  plan: string;
  role: "owner" | "member";
}

export interface WorkspaceMember {
  user_id: string;
  name: string;
  email: string;
  role: "owner" | "member";
}
