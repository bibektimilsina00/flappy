import { useCommunityWorks } from "../hooks/use-community-works";
import { CommunityCard } from "./community-card";

// Self-contained section: wires its own data, renders the grid.
export function CommunityWorks() {
  const { works } = useCommunityWorks();

  return (
    <section>
      <h2 className="text-2xl font-semibold">Community Works</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Thousands of creators, posting in public. Scroll to see what&apos;s landing today
      </p>

      <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {works.map((work) => (
          <CommunityCard key={work.id} work={work} />
        ))}
      </div>
    </section>
  );
}
