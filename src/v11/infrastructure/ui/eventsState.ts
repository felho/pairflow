import type {
  UiBubbleRemovedEvent,
  UiBubbleUpdatedEvent
} from "../../../contracts/ui/uiEvents.js";
import type {
  UiBubbleSummary,
  UiRepoSummary
} from "../../../contracts/ui/uiReadModel.js";

export interface BubbleFingerprintSnapshot {
  summary: UiBubbleSummary;
  fingerprint: string;
}

export interface RepoSnapshot {
  repo: UiRepoSummary;
  bubbles: Map<string, BubbleFingerprintSnapshot>;
}

export interface RepoDiff {
  repoPath: string;
  repo: UiRepoSummary;
  changed: UiBubbleUpdatedEvent[];
  removed: UiBubbleRemovedEvent[];
  repoChanged: boolean;
  snapshot: RepoSnapshot;
}
