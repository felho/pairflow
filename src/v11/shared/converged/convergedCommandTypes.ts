import type {
  AgentName
} from "../../domain/agentIdentity/agentIdentity.js";
import type { BubbleStateSnapshot } from "../state/bubbleStateSnapshotTypes.js";
import type { ActorEmitContextSnapshot } from "../actorProtocol/actorEmitContext.js";
import type { EmitBubbleNotification } from "../delivery/bubbleNotificationContract.js";
import type {
  EmitDeliveryNotificationAckPort
} from "../../ports/tmuxDelivery.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type { MetaReviewGateRoute } from "../metaReviewGate/index.js";
import type {
  ApplyMetaReviewGateOnConvergencePort
} from "../metaReviewGate/metaReviewGateCommandContract.js";
import type {
  ResolveReviewerTestExecutionDirectivePort
} from "../../ports/reviewerTestEvidenceArtifacts.js";

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
  emitDeliveryNotificationAck?: EmitDeliveryNotificationAckPort;
  emitBubbleNotification?: EmitBubbleNotification;
  applyMetaReviewGateOnConvergence?: ApplyMetaReviewGateOnConvergencePort;
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
    reason?: string;
    reason_code?: string;
    retried: boolean;
  };
}
