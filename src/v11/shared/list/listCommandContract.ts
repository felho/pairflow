import type { RuntimeSessionRecord } from "../ports/runtimeSessions.js";
import type { StateValidationDiagnostics } from "../ports/stateSnapshots.js";
import type {
  ActiveMetaReviewRuntimeDeliveryView
} from "../metaReview/metaReviewSnapshot.js";
import type {
  BubbleLifecycleState,
  BubbleReviewPolicyRuntimeView
} from "../../../types/bubble.js";
import type { UiBubbleAttention } from "../../../types/ui.js";
import type { UiBubbleListRemoteExecution } from "../../../types/uiRemoteExecution.js";

export interface BubbleListInput {
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now?: Date | undefined;
  refresh?: boolean | undefined;
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
  reviewPolicy?: BubbleReviewPolicyRuntimeView;
  metaReview: {
    actor: "meta-reviewer";
    authorityActive: boolean;
    consecutiveCleanRuns: number;
    runtimeDelivery: ActiveMetaReviewRuntimeDeliveryView | null;
  };
  remoteExecution?: UiBubbleListRemoteExecution;
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
  remoteExecutionSummary?: {
    createdNotStarted: number;
    unavailableStarted: number;
    refreshedThisRun?: boolean;
  };
}
