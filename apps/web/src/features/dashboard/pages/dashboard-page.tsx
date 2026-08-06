"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useBalance } from "@/features/billing";
import type { NodeKind } from "@/features/canvas";
import { CommunityWorks } from "@/features/community";
import { createWorkflow, RecentProjects } from "@/features/projects";
import { useSession } from "@/stores/session";
import { Composer } from "../components/composer";
import { Greeting } from "../components/greeting";
import { useComposer } from "../hooks/use-composer";

const PLACEHOLDER: Record<NodeKind, string> = {
  text: "Describe the text or script to write…",
  image: "Describe an image to generate…",
  video: "Describe a video to generate…",
  audio: "Describe the audio to generate…",
  world: "Describe a scene to generate…",
};

// Kinds a free plan can't run — mirrors the composer's PREMIUM_KINDS.
const PREMIUM_KINDS = new Set<NodeKind>(["video"]);

export function DashboardPage() {
  const userName = useSession((s) => s.user?.name)?.split(" ")[0] ?? "there";
  const { data: balance } = useBalance();
  const router = useRouter();
  const [kind, setKind] = useState<NodeKind>("video");
  const [busy, setBusy] = useState(false);

  const isPremium = (balance?.plan ?? "free") !== "free";
  const goPricing = () => router.push("/pricing");

  // Once the plan is known, a free user sitting on the (default) video tab gets
  // bumped to a free kind — so the active tab is never a locked one.
  useEffect(() => {
    if (balance && !isPremium && PREMIUM_KINDS.has(kind)) setKind("image");
  }, [balance, isPremium, kind]);

  // Create a project seeded with one node of the chosen kind carrying the
  // prompt, then open the canvas and auto-run that node.
  const start = async (text: string) => {
    if (busy) return;
    if (!isPremium && PREMIUM_KINDS.has(kind)) {
      toast.info("Upgrade to Pro to generate AI videos");
      return goPricing();
    }
    setBusy(true);
    try {
      const nodeId = `node-${crypto.randomUUID()}`;
      const graph = {
        nodes: [
          {
            id: nodeId,
            type: kind,
            position: { x: 240, y: 160 },
            data: { kind, prompt: text },
          },
        ],
        edges: [],
      };
      const wf = await createWorkflow(text.slice(0, 48) || "Untitled project", graph);
      toast.success("Created new canvas workflow!");
      router.push(`/canvas?project=${wf.id}&run=${nodeId}`);
    } catch (e) {
      setBusy(false);
      const msg = e instanceof Error ? e.message : "Couldn't start generation";
      toast.error(msg);
    }
  };

  const composer = useComposer(start);

  return (
    <div className="relative h-full overflow-y-auto">
      {/* One column, uniform gap between every block */}
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-6 pb-20 pt-[12vh]">
        <div className="w-full space-y-6">
          <Greeting name={userName} />
          <Composer
            value={composer.value}
            onChange={composer.setValue}
            onSubmit={() => composer.submit(kind)}
            kind={kind}
            onKindChange={setKind}
            isPremium={isPremium}
            onUpgrade={goPricing}
            busy={busy}
            placeholder={PLACEHOLDER[kind]}
          />
        </div>
        <RecentProjects />
        <CommunityWorks />
      </div>
    </div>
  );
}
