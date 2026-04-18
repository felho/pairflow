import type {
  BubbleFailingGate,
  BubbleLifecycleState,
  BubbleRoundGateState,
  BubbleSpecLockState
} from "../../../types/bubble.js";
import type { ProtocolMessageType } from "../../../types/protocol.js";
import type { StateValidationDiagnostics } from "../ports/stateSnapshots.js";
import type { ReviewVerificationState } from "../reviewer/reviewVerification.js";
import type {
  StatusExecutionContextView,
  StatusMetaReviewView,
  StatusPaneActivityView
} from "./statusCommandViewProjection.js";
import type { WatchdogStatus } from "../watchdog/watchdogStatus.js";

export interface RemoteBubbleStatusTarget {
  alias: string;
  host: string;
  user?: string;
  pairflowCommand: string;
}

export interface RemoteBubbleStatusSnapshot {
  bubbleStartedAt: string | null;
  state: BubbleLifecycleState;
  round: number;
  activeAgent: string | null;
  activeRole: string | null;
  activeSince: string | null;
  lastCommandAt: string | null;
  paneActivity: StatusPaneActivityView;
  executionContext: StatusExecutionContextView | null;
  watchdog: WatchdogStatus;
  pendingInboxItems: {
    humanQuestions: number;
    approvalRequests: number;
    total: number;
  };
  transcript: {
    totalMessages: number;
    lastMessageType: ProtocolMessageType | null;
    lastMessageTs: string | null;
    lastMessageId: string | null;
  };
  metaReview: StatusMetaReviewView;
  accuracyCritical: boolean;
  lastReviewVerification: ReviewVerificationState;
  failingGates: BubbleFailingGate[];
  specLockState: BubbleSpecLockState;
  roundGateState: BubbleRoundGateState;
  stateValidation: StateValidationDiagnostics | null;
  runtimeAvailability: "active" | "inactive" | "missing";
  lastCheckedAt: string;
}

export type RemoteBubbleStatusErrorCode =
  | "REMOTE_STATUS_CONFIG_INVALID"
  | "REMOTE_STATUS_CONFIG_UNAVAILABLE"
  | "REMOTE_STATUS_TRANSPORT_FAILED"
  | "REMOTE_STATUS_PAYLOAD_INVALID";

export interface RemoteBubbleStatusErrorLike extends Error {
  code: RemoteBubbleStatusErrorCode;
}

export function isRemoteBubbleStatusErrorLike(
  error: unknown
): error is RemoteBubbleStatusErrorLike {
  return (
    error instanceof Error
    && error.name === "RemoteBubbleStatusError"
    && "code" in error
    && typeof error.code === "string"
  );
}
