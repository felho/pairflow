import { type EnsureBubbleInstanceIdForMutationResult } from "../../../core/bubble/bubbleInstanceId.js";
import { type ResolvedBubbleWorkspace } from "../../../core/bubble/workspaceResolution.js";
import { type SummaryVerifierConsistencyGateDecisionRecord } from "../../../core/reviewer/summaryVerifierConsistencyGate.js";
import { type appendProtocolEnvelope } from "../../../v11/infrastructure/artifact/transcript/transcriptStore.js";
import { type assessPairflowCommandPath } from "../../../core/runtime/pairflowCommand.js";
import { type emitBubbleLifecycleEventBestEffort } from "../../../core/metrics/bubbleEvents.js";
import { type MetaReviewGateRoute } from "../../shared/metaReviewGate/metaReviewGateCommandContract.js";
import type {
  BubbleRoundGateState,
  BubbleSpecLockState,
  BubbleStateSnapshot
} from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";

export type ConvergedDelivery = {
  delivered: boolean;
  reason?: string;
  retried: boolean;
};

export interface FinalizeConvergedFlowInput {
  resolved: ResolvedBubbleWorkspace;
  bubbleIdentity: EnsureBubbleInstanceIdForMutationResult;
  state: BubbleStateSnapshot;
  summary: string;
  refs: string[];
  now: Date;
  convergence: Awaited<ReturnType<typeof appendProtocolEnvelope>>;
  gateResult: {
    route: MetaReviewGateRoute;
    gateSequence: number;
    gateEnvelope: ProtocolEnvelope;
    state: BubbleStateSnapshot;
    metaReviewRun?: {
      status: string;
      recommendation: string;
      warnings?: Array<{ reason_code: string }>;
      rework_target_message?: string | null;
    };
  };
  summaryVerifierGateDecision: SummaryVerifierConsistencyGateDecisionRecord;
  specLockState: BubbleSpecLockState;
  roundGateState: BubbleRoundGateState;
  docGateArtifactReadFailureReason?: string;
  delivery?: ConvergedDelivery;
}

export interface FinalizeConvergedFlowDependencies {
  assessPairflowCommandPath?: typeof assessPairflowCommandPath;
  emitBubbleLifecycleEventBestEffort?: typeof emitBubbleLifecycleEventBestEffort;
  resolveMetaReviewRolloutBlockingReasonCodes: (input: {
    gateRoute: MetaReviewGateRoute;
    metaReviewWarnings: Array<{ reason_code: string }>;
    commandPathStatus: ReturnType<typeof assessPairflowCommandPath>;
  }) => string[];
  activeEntrypoint?: string;
}

export interface FinalizeConvergedFlowResult {
  bubbleId: string;
  convergenceSequence: number;
  convergenceEnvelope: ProtocolEnvelope;
  gateRoute: MetaReviewGateRoute;
  approvalRequestSequence: number;
  approvalRequestEnvelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
  delivery?: ConvergedDelivery;
}
