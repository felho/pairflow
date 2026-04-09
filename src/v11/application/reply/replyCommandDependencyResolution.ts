import { replyBubbleDependencyDefaults } from "../../../core/bubble/replyBubbleDefaults.js";
import type {
  EmitHumanReplyDependencies,
} from "./replyCommandContract.js";

export interface ResolvedReplyCommandDependencies {
  appendProtocolEnvelope: NonNullable<EmitHumanReplyDependencies["appendProtocolEnvelope"]>;
  emitTmuxDeliveryNotification: NonNullable<
    EmitHumanReplyDependencies["emitTmuxDeliveryNotification"]
  >;
  ensureBubbleInstanceIdForMutation: NonNullable<
    EmitHumanReplyDependencies["ensureBubbleInstanceIdForMutation"]
  >;
  readStateSnapshot: NonNullable<EmitHumanReplyDependencies["readStateSnapshot"]>;
  resolveBubbleById: NonNullable<EmitHumanReplyDependencies["resolveBubbleById"]>;
  resolveDeliveryMessageRef: NonNullable<
    EmitHumanReplyDependencies["resolveDeliveryMessageRef"]
  >;
  writeStateSnapshot: NonNullable<EmitHumanReplyDependencies["writeStateSnapshot"]>;
}

export function resolveReplyCommandDependencies(
  dependencies: EmitHumanReplyDependencies = {}
): ResolvedReplyCommandDependencies {
  return {
    appendProtocolEnvelope:
      dependencies.appendProtocolEnvelope
      ?? replyBubbleDependencyDefaults.appendProtocolEnvelope,
    emitTmuxDeliveryNotification:
      dependencies.emitTmuxDeliveryNotification
      ?? replyBubbleDependencyDefaults.emitTmuxDeliveryNotification,
    ensureBubbleInstanceIdForMutation:
      dependencies.ensureBubbleInstanceIdForMutation
      ?? replyBubbleDependencyDefaults.ensureBubbleInstanceIdForMutation,
    readStateSnapshot:
      dependencies.readStateSnapshot ?? replyBubbleDependencyDefaults.readStateSnapshot,
    resolveBubbleById:
      dependencies.resolveBubbleById ?? replyBubbleDependencyDefaults.resolveBubbleById,
    resolveDeliveryMessageRef:
      dependencies.resolveDeliveryMessageRef
      ?? replyBubbleDependencyDefaults.resolveDeliveryMessageRef,
    writeStateSnapshot:
      dependencies.writeStateSnapshot ?? replyBubbleDependencyDefaults.writeStateSnapshot
  };
}
