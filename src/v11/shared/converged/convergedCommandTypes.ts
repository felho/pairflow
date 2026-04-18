import type { AgentName } from "../../../types/bubble.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { ActorEmitContextSnapshot } from "../actorProtocol/actorEmitContext.js";
import type { EmitBubbleNotification } from "../delivery/bubbleNotificationContract.js";
import type { EmitDeliveryAckLikePort } from "../ports/tmuxDelivery.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type {
  applyMetaReviewGateOnConvergence
} from "../metaReviewGate/metaReviewGateCommandApi.js";
import type { MetaReviewGateRoute } from "../metaReviewGate/metaReviewGateCommandContract.js";
import type {
  ResolveReviewerTestExecutionDirectivePort
} from "../ports/reviewerTestEvidenceArtifacts.js";

export const convergedStructuredFindingSeverities = ["P2", "P3"] as const;
export type ConvergedStructuredFindingSeverity =
  (typeof convergedStructuredFindingSeverities)[number];

export interface ConvergedStructuredFinding {
  severity: ConvergedStructuredFindingSeverity;
  title: string;
  refs?: string[];
}

export function isConvergedStructuredFindingSeverity(
  value: unknown
): value is ConvergedStructuredFindingSeverity {
  return (
    typeof value === "string"
    && (convergedStructuredFindingSeverities as readonly string[]).includes(value)
  );
}

export interface EmitConvergedInput {
  summary: string;
  refs?: string[];
  findings?: ConvergedStructuredFinding[];
  cwd?: string;
  now?: Date;
  authoritativeContext?: ActorEmitContextSnapshot;
  expectedStateFingerprint?: string;
  expectedRound?: number;
  expectedReviewer?: AgentName;
}

export interface EmitConvergedDependencies {
  emitDeliveryNotificationAck?: EmitDeliveryAckLikePort;
  emitTmuxDeliveryNotification?: EmitDeliveryAckLikePort;
  emitBubbleNotification?: EmitBubbleNotification;
  applyMetaReviewGateOnConvergence?: typeof applyMetaReviewGateOnConvergence;
  resolveReviewerTestExecutionDirective?:
    ResolveReviewerTestExecutionDirectivePort;
}

export interface EmitConvergedResult {
  bubbleId: string;
  convergenceSequence: number;
  convergenceEnvelope: ProtocolEnvelope;
  gateRoute: MetaReviewGateRoute;
  approvalRequestSequence: number;
  approvalRequestEnvelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
  delivery?: {
    status: "accepted" | "rejected";
    delivered: boolean;
    reason?: string;
    reason_code?: string;
    retried: boolean;
  };
}
