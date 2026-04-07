import { ensureBubbleInstanceIdForMutation } from "../../../core/bubble/bubbleInstanceId.js";
import { resolveBubbleById } from "../../../core/bubble/bubbleLookup.js";
import { appendProtocolEnvelope } from "../../../core/protocol/transcriptStore.js";
import { readStateSnapshot, writeStateSnapshot } from "../../../core/state/stateStore.js";
import {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef
} from "../../../core/runtime/tmuxDelivery.js";
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
      dependencies.appendProtocolEnvelope ?? appendProtocolEnvelope,
    emitTmuxDeliveryNotification:
      dependencies.emitTmuxDeliveryNotification ?? emitTmuxDeliveryNotification,
    ensureBubbleInstanceIdForMutation:
      dependencies.ensureBubbleInstanceIdForMutation
      ?? ensureBubbleInstanceIdForMutation,
    readStateSnapshot: dependencies.readStateSnapshot ?? readStateSnapshot,
    resolveBubbleById: dependencies.resolveBubbleById ?? resolveBubbleById,
    resolveDeliveryMessageRef:
      dependencies.resolveDeliveryMessageRef ?? resolveDeliveryMessageRef,
    writeStateSnapshot: dependencies.writeStateSnapshot ?? writeStateSnapshot
  };
}
