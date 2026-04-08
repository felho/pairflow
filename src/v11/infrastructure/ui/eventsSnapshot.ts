import type { UiBubbleSummary } from "../../../types/ui.js";
import type { UiEventsSubscriptionInput } from "./eventsTypes.js";
import type { RepoSnapshot } from "./eventsState.js";
import { createFilter } from "./eventsFilter.js";

export function buildUiEventsSnapshot(input: {
  snapshots: Map<string, RepoSnapshot>;
  nextEventId: number;
  subscription?: UiEventsSubscriptionInput | undefined;
}): {
  id: number;
  ts: string;
  type: "snapshot";
  repos: Array<RepoSnapshot["repo"]>;
  bubbles: UiBubbleSummary[];
} {
  const filter = createFilter(input.subscription);
  const repos: Array<RepoSnapshot["repo"]> = [];
  const bubbles: UiBubbleSummary[] = [];

  for (const snapshot of input.snapshots.values()) {
    if (filter.repos !== undefined && !filter.repos.has(snapshot.repo.repoPath)) {
      continue;
    }
    repos.push(snapshot.repo);

    for (const entry of snapshot.bubbles.values()) {
      if (
        filter.bubbleId !== undefined &&
        entry.summary.bubbleId !== filter.bubbleId
      ) {
        continue;
      }
      bubbles.push(entry.summary);
    }
  }

  repos.sort((left, right) => left.repoPath.localeCompare(right.repoPath));
  bubbles.sort((left, right) => {
    const byRepo = left.repoPath.localeCompare(right.repoPath);
    if (byRepo !== 0) {
      return byRepo;
    }
    return left.bubbleId.localeCompare(right.bubbleId);
  });

  const id = Math.max(0, input.nextEventId - 1);
  const ts = new Date().toISOString();
  return {
    id,
    ts,
    type: "snapshot",
    repos,
    bubbles
  };
}
