import type { EnsureBubbleInstanceIdForMutationResult } from "../../shared/ports/bubbleIdentity.js";
import type { ResolvedBubbleWorkspace } from "../../shared/ports/workspaceResolution.js";
import type {
  AppendProtocolEnvelopeResult
} from "../../shared/ports/transcript.js";
import type {
  AssessPairflowCommandPathPort,
  PairflowCommandPathAssessment
} from "../../shared/ports/pairflowCommand.js";
import { type SummaryVerifierConsistencyGateDecisionRecord } from "../../../v11/shared/reviewer/summaryVerifierConsistencyGate.js";
import { type emitBubbleLifecycleEventBestEffort } from "../../../v11/shared/metrics/bubbleEvents.js";
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
  convergence: AppendProtocolEnvelopeResult;
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
  assessPairflowCommandPath?: AssessPairflowCommandPathPort;
  emitBubbleLifecycleEventBestEffort?: typeof emitBubbleLifecycleEventBestEffort;
  resolveMetaReviewRolloutBlockingReasonCodes: (input: {
    gateRoute: MetaReviewGateRoute;
    metaReviewWarnings: Array<{ reason_code: string }>;
    commandPathStatus: PairflowCommandPathAssessment;
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
