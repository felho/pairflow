import type { EnsureBubbleInstanceIdForMutationResult } from "../../ports/bubbleIdentity.js";
import type { ResolvedBubbleWorkspace } from "../../ports/workspaceResolution.js";
import type {
  AppendProtocolEnvelopeResult
} from "../../ports/transcript.js";
import type {
  AssessPairflowCommandPathPort,
  PairflowCommandPathAssessment
} from "../../ports/pairflowCommand.js";
import { type SummaryVerifierConsistencyGateDecisionRecord } from "../../shared/reviewer/summaryVerifierConsistencyGate.js";
import type { EmitBubbleLifecycleEventBestEffortPort } from "../../shared/metrics/bubbleEvents.js";
import { type MetaReviewGateRoute } from "../../shared/metaReviewGate/index.js";
import type { BubbleStateSnapshot } from "../../shared/state/bubbleStateSnapshotTypes.js";
import type {
  BubbleRoundGateState,
  BubbleSpecLockState
} from "../../shared/gates/gateStateTypes.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";

export type ConvergedDelivery = {
  status: "accepted" | "rejected";
  reason?: string;
  reason_code?: string;
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
  emitBubbleLifecycleEventBestEffort?: EmitBubbleLifecycleEventBestEffortPort;
  resolveMetaReviewRolloutBlockingReasonCodes: (input: {
    gateRoute: MetaReviewGateRoute;
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
