"use client";

import { Loader2, XCircle } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { joinWorkspace } from "@/features/account/api";

// Invite link landing: join the workspace, make it active, go to the dashboard.
// (AuthGuard wraps this route, so the user is signed in by the time it runs.)
export default function Page() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || !token) return;
    ran.current = true;
    joinWorkspace(token)
      .then((ws) => {
        localStorage.setItem("active-workspace", ws.id);
        router.replace("/dashboard");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Invalid invite link"));
  }, [token, router]);

  return (
    <div className="grid h-full place-items-center">
      {error ? (
        <div className="text-center">
          <XCircle className="mx-auto size-8 text-red-400" />
          <p className="mt-3 text-sm text-muted-foreground">{error}</p>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Joining workspace…
        </div>
      )}
    </div>
  );
}
