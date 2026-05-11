import type {
  EmitDeliveryNotificationAckPort
} from "../../ports/tmuxDelivery.js";
import type { AppendProtocolEnvelopePort } from "../../ports/transcript.js";
import type {
  ReadStateSnapshotPort,
  WriteStateSnapshotPort
} from "../../ports/stateSnapshots.js";
import type { ResolveBubbleByIdPort } from "../../ports/bubbleLookup.js";
import type { ResolveDeliveryMessageRefPort } from "../../ports/tmuxDelivery.js";
import type { EnsureBubbleInstanceIdForMutationPort } from "../../ports/bubbleIdentity.js";
import type { BubbleStateSnapshot } from "../../domain/state/bubbleStateSnapshotTypes.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";

export interface EmitHumanReplyInput {
  bubbleId: string;
  message: string;
  refs?: string[];
  repoPath?: string;
  cwd?: string;
  now?: Date;
}

export interface EmitHumanReplyResult {
  bubbleId: string;
  sequence: number;
  envelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
}

export interface EmitHumanReplyDependencies {
  appendProtocolEnvelope?: AppendProtocolEnvelopePort;
  emitDeliveryNotificationAck?: EmitDeliveryNotificationAckPort;
  ensureBubbleInstanceIdForMutation?: EnsureBubbleInstanceIdForMutationPort;
  readStateSnapshot?: ReadStateSnapshotPort;
  resolveBubbleById?: ResolveBubbleByIdPort;
  resolveDeliveryMessageRef?: ResolveDeliveryMessageRefPort;
  writeStateSnapshot?: WriteStateSnapshotPort;
}
