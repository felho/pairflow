import type { UiBubbleRemovedEvent, UiBubbleUpdatedEvent } from "../../../types/ui.js";
import type { UiBubbleSummary, UiRepoSummary } from "../../../types/ui.js";

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

export interface SnapshotView {
  id: number;
  ts: string;
  type: "snapshot";
  repos: UiRepoSummary[];
  bubbles: UiBubbleSummary[];
}
