import type { StateValidationDiagnostics } from "../../infrastructure/state/stateStore.js";
import type { RuntimeSessionRecord } from "../../infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import type {
  BubbleLifecycleState,
  MetaReviewRecommendation,
  MetaReviewRunStatus,
  MetaReviewRuntimeDeliveryStatus
} from "../../../types/bubble.js";
import type { UiBubbleAttention } from "../../../types/ui.js";

export interface BubbleListInput {
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now?: Date | undefined;
}

export interface BubbleListEntry {
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
  state: BubbleLifecycleState;
  round: number;
  activeAgent: string | null;
  activeRole: string | null;
  activeSince: string | null;
  lastCommandAt: string | null;
  stateValidation: StateValidationDiagnostics | null;
  runtimeSession: RuntimeSessionRecord | null;
  attention: UiBubbleAttention | null;
  metaReview: {
    actor: "meta-reviewer";
    authorityActive: boolean;
    latestRecommendation: MetaReviewRecommendation | null;
    latestStatus: MetaReviewRunStatus | null;
    latestSummary: string | null;
    latestReportRef: string | null;
    latestUpdatedAt: string | null;
    runtimeDelivery: {
      status: MetaReviewRuntimeDeliveryStatus;
      reasonCode: string | null;
      message: string;
      observedAt: string;
      observedForHandoffId: string | null;
      observedForRound: number | null;
    } | null;
  };
}

export interface BubbleListStateCounts {
  CREATED: number;
  PREPARING_WORKSPACE: number;
  RUNNING: number;
  WAITING_HUMAN: number;
  READY_FOR_HUMAN_APPROVAL: number;
  APPROVED_FOR_COMMIT: number;
  COMMITTED: number;
  DONE: number;
  FAILED: number;
  CANCELLED: number;
}

export interface BubbleListView {
  repoPath: string;
  total: number;
  byState: BubbleListStateCounts;
  runtimeSessions: {
    registered: number;
    stale: number;
  };
  bubbles: BubbleListEntry[];
}
