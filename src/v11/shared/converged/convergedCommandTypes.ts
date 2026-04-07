import type { AgentName } from "../../../types/bubble.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { EmitBubbleNotificationPort } from "../ports/notifications.js";
import type { EmitTmuxDeliveryNotificationPort } from "../ports/tmuxDelivery.js";
import type { ActorEmitContextSnapshot } from "../actorProtocol/actorEmitContext.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type {
  applyMetaReviewGateOnConvergence,
  recoverMetaReviewGateFromSnapshot
} from "../metaReviewGate/metaReviewGateCommandApi.js";
import type { MetaReviewGateRoute } from "../metaReviewGate/metaReviewGateCommandContract.js";

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
  emitTmuxDeliveryNotification?: EmitTmuxDeliveryNotificationPort;
  emitBubbleNotification?: EmitBubbleNotificationPort;
  applyMetaReviewGateOnConvergence?: typeof applyMetaReviewGateOnConvergence;
  recoverMetaReviewGateFromSnapshot?: typeof recoverMetaReviewGateFromSnapshot;
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
    delivered: boolean;
    reason?: string;
    retried: boolean;
  };
}
