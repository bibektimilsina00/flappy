"use client";

import { useBalance } from "@/features/billing";
import { CommunityWorks } from "@/features/community";
import { RecentProjects } from "@/features/projects";
import { useSession } from "@/stores/session";
import { Composer } from "../components/composer";
import { Greeting } from "../components/greeting";
import { TokenBadge } from "../components/token-badge";
import { useComposer } from "../hooks/use-composer";

export function DashboardPage() {
  const userName = useSession((s) => s.user?.name)?.split(" ")[0] ?? "there";
  const { data: balance } = useBalance();
  const composer = useComposer((text) => console.log("submit:", text));

  return (
    <div className="relative h-full overflow-y-auto">
      <div className="absolute right-6 top-4 z-10">
        <TokenBadge value={Math.round(balance?.balance ?? 0)} />
      </div>

      {/* One column, uniform gap between every block. Anchored from the top
          (pt), so blocks below never shift the greeting/composer up. */}
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 pb-20 pt-[24vh]">
        <div className="w-full space-y-6">
          <Greeting name={userName} />
          <Composer
            value={composer.value}
            onChange={composer.setValue}
            onSubmit={composer.submit}
            placeholder="Describe a video to generate…"
          />
        </div>
        <RecentProjects />
        <CommunityWorks />
      </div>
    </div>
  );
}
