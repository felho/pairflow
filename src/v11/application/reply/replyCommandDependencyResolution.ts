import { appendProtocolEnvelope } from "../../shared/transcript/transcriptDependencyDefaults.js";
import { writeStateSnapshot } from "../../shared/state/stateStoreDefaults.js";
import type { EmitHumanReplyDependencies } from "./replyCommandContract.js";
import { startCommandContextDefaults } from "../start/startCommandDependencyDefaults.js";
import { reviewerDeliveryDefaults } from "../pass/reviewerDeliveryDefaults.js";

async function emitDeliveryNotificationAck(
  ...args: Parameters<typeof reviewerDeliveryDefaults.emitDeliveryNotificationAck>
): Promise<
  Awaited<ReturnType<typeof reviewerDeliveryDefaults.emitDeliveryNotificationAck>>
> {
  return reviewerDeliveryDefaults.emitDeliveryNotificationAck(...args);
}

async function ensureBubbleInstanceIdForMutation(
  ...args: Parameters<typeof startCommandContextDefaults.ensureBubbleInstanceIdForMutation>
): Promise<
  Awaited<ReturnType<typeof startCommandContextDefaults.ensureBubbleInstanceIdForMutation>>
> {
  return startCommandContextDefaults.ensureBubbleInstanceIdForMutation(...args);
}

async function readStateSnapshot(
  ...args: Parameters<typeof startCommandContextDefaults.readStateSnapshot>
): Promise<Awaited<ReturnType<typeof startCommandContextDefaults.readStateSnapshot>>> {
  return startCommandContextDefaults.readStateSnapshot(...args);
}

async function resolveBubbleById(
  ...args: Parameters<typeof startCommandContextDefaults.resolveBubbleById>
): Promise<Awaited<ReturnType<typeof startCommandContextDefaults.resolveBubbleById>>> {
  return startCommandContextDefaults.resolveBubbleById(...args);
}

function resolveDeliveryMessageRef(
  ...args: Parameters<typeof reviewerDeliveryDefaults.resolveDeliveryMessageRef>
): ReturnType<typeof reviewerDeliveryDefaults.resolveDeliveryMessageRef> {
  return reviewerDeliveryDefaults.resolveDeliveryMessageRef(...args);
}

const replyCommandDependencyDefaults = {
  appendProtocolEnvelope,
  emitDeliveryNotificationAck,
  ensureBubbleInstanceIdForMutation,
  readStateSnapshot,
  resolveBubbleById,
  resolveDeliveryMessageRef,
  writeStateSnapshot
} as const;

export interface ResolvedReplyCommandDependencies {
  appendProtocolEnvelope: NonNullable<EmitHumanReplyDependencies["appendProtocolEnvelope"]>;
  emitDeliveryNotificationAck: NonNullable<
    EmitHumanReplyDependencies["emitDeliveryNotificationAck"]
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
      ?? replyCommandDependencyDefaults.appendProtocolEnvelope,
    emitDeliveryNotificationAck:
      dependencies.emitDeliveryNotificationAck
      ?? replyCommandDependencyDefaults.emitDeliveryNotificationAck,
    ensureBubbleInstanceIdForMutation:
      dependencies.ensureBubbleInstanceIdForMutation
      ?? replyCommandDependencyDefaults.ensureBubbleInstanceIdForMutation,
    readStateSnapshot:
      dependencies.readStateSnapshot ?? replyCommandDependencyDefaults.readStateSnapshot,
    resolveBubbleById:
      dependencies.resolveBubbleById ?? replyCommandDependencyDefaults.resolveBubbleById,
    resolveDeliveryMessageRef:
      dependencies.resolveDeliveryMessageRef
      ?? replyCommandDependencyDefaults.resolveDeliveryMessageRef,
    writeStateSnapshot:
      dependencies.writeStateSnapshot ?? replyCommandDependencyDefaults.writeStateSnapshot
  };
}
