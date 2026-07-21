import { COMMUNITY_WORKS } from "../constants";
import type { CommunityWork } from "../types";

export function useCommunityWorks(): { works: CommunityWork[] } {
  // ponytail: static seed; swap for a services/ query against the public feed.
  return { works: COMMUNITY_WORKS };
}
