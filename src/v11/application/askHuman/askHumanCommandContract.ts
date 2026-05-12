import type {
  EmitAskHumanBubbleNotificationPort
} from "./internal/delivery/askHumanDeliveryPortsContract.js";
import type { BubbleStateSnapshot } from "../../domain/state/snapshot/bubbleStateSnapshot.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type {
  ActorActivationProvenance,
  ActorEmitContextSnapshot
} from "../../shared/actorProtocol/actorEmitContext.js";
import type {
  DeliveryAck,
  DeliveryTargetReasonCode,
  EmitDeliveryNotificationAckPort,
  ResolveDeliveryMessageRefPort
} from "../../ports/tmuxDelivery.js";
import type { EmitBubbleLifecycleEventBestEffortPort } from "../../shared/metrics/bubbleEvents.js";
import type {
  EnsureAskHumanBubbleInstanceIdentity,
  ReadAskHumanStateSnapshot,
  ResolveAskHumanBubbleFromWorkspaceCwd
} from "./internal/delivery/askHumanRoutingContract.js";

export type AskHumanActivationProvenance = ActorActivationProvenance;

export interface EmitAskHumanInput {
  question: string;
  refs?: string[];
  cwd?: string;
  authoritativeContext?: ActorEmitContextSnapshot;
  now?: Date;
}

export interface EmitAskHumanResult {
  bubbleId: string;
  sequence: number;
  envelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
  inferredRecipient: "human";
  activation?: AskHumanActivationProvenance;
  delivery?: {
    status: DeliveryAck["status"];
    message?: string;
    reason?: Extract<DeliveryAck, { status: "rejected" }>["reason"];
    reason_code?: Extract<DeliveryAck, { status: "rejected" }>["reason_code"];
    deliveryTargetReasonCode?: DeliveryTargetReasonCode;
  };
}

export interface EmitAskHumanDependencies {
  resolveBubbleFromWorkspaceCwd?: ResolveAskHumanBubbleFromWorkspaceCwd;
  ensureBubbleInstanceIdForMutation?: EnsureAskHumanBubbleInstanceIdentity;
  readStateSnapshot?: ReadAskHumanStateSnapshot;
  emitDeliveryNotificationAck?: EmitDeliveryNotificationAckPort;
  emitBubbleNotification?: EmitAskHumanBubbleNotificationPort;
  resolveDeliveryMessageRef?: ResolveDeliveryMessageRefPort;
  emitBubbleLifecycleEventBestEffort?: EmitBubbleLifecycleEventBestEffortPort;
}
