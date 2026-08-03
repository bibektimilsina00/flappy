import { useSession } from "@/stores/session";

// Gateway errors that mean "backend momentarily unreachable" — normal during a
// deploy while the api container restarts. We retry these silently so an active
// user never sees a raw 502.
//   UNREACHABLE: upstream/origin down → the request never ran → safe to retry
//                any method (incl. POST).
//   TIMEOUT: the request may have run → only auto-retry idempotent methods.
const UNREACHABLE = new Set([502, 503, 521, 523]);
const TIMEOUT = new Set([504, 524]);
const MAX_RETRIES = 3;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// exponential backoff + jitter: ~0.3s, 0.7s, 1.5s — covers a container restart.
const backoff = (attempt: number) => 300 * 2 ** attempt + Math.floor(Math.random() * 200);

// Thin fetch wrapper. next.config rewrites /api -> FastAPI at :8000.
// Attaches the JWT, clears the session on 401, surfaces the API error detail,
// and rides out transient gateway blips (deploys) with a few silent retries.
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const idempotent = method === "GET" || method === "HEAD";

  for (let attempt = 0; ; attempt++) {
    const token = useSession.getState().token;
    // Active workspace (workspace switcher). Absent -> backend uses the first owned one.
    const wsId = typeof window !== "undefined" ? localStorage.getItem("active-workspace") : null;

    let res: Response;
    try {
      res = await fetch(`/api/v1${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(wsId ? { "X-Workspace-Id": wsId } : {}),
          ...init?.headers,
        },
      });
    } catch (e) {
      // network failure (origin unreachable mid-deploy). Retry idempotent
      // requests; a POST that may have partially sent is not auto-retried.
      if (idempotent && attempt < MAX_RETRIES) {
        await sleep(backoff(attempt));
        continue;
      }
      throw e;
    }

    const retriable =
      UNREACHABLE.has(res.status) || (TIMEOUT.has(res.status) && idempotent);
    if (retriable && attempt < MAX_RETRIES) {
      await sleep(backoff(attempt));
      continue;
    }

    if (res.status === 401) useSession.getState().clear();

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { detail?: string } | null;
      throw new Error(body?.detail ?? `${res.status} ${res.statusText}`);
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }
}
