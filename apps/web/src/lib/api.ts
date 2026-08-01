import { useSession } from "@/stores/session";

// Thin fetch wrapper. next.config rewrites /api -> FastAPI at :8000.
// Attaches the JWT, clears the session on 401, surfaces the API error detail.
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = useSession.getState().token;
  // Active workspace (workspace switcher). Absent -> backend uses the first owned one.
  const wsId = typeof window !== "undefined" ? localStorage.getItem("active-workspace") : null;

  const res = await fetch(`/api/v1${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(wsId ? { "X-Workspace-Id": wsId } : {}),
      ...init?.headers,
    },
  });

  if (res.status === 401) useSession.getState().clear();

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `${res.status} ${res.statusText}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
