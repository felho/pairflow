import type { EmitTmuxDeliveryNotificationPort } from "../../shared/ports/tmuxDelivery.js";
import type { AppendProtocolEnvelopePort } from "../../shared/ports/transcript.js";
import type {
  ReadStateSnapshotPort,
  WriteStateSnapshotPort
} from "../../shared/ports/stateSnapshots.js";
import type { ResolveBubbleByIdPort } from "../../shared/ports/bubbleLookup.js";
import type { ResolveDeliveryMessageRefPort } from "../../shared/ports/tmuxDelivery.js";
import type { EnsureBubbleInstanceIdForMutationPort } from "../../shared/ports/bubbleIdentity.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
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
  emitTmuxDeliveryNotification?: EmitTmuxDeliveryNotificationPort;
  ensureBubbleInstanceIdForMutation?: EnsureBubbleInstanceIdForMutationPort;
  readStateSnapshot?: ReadStateSnapshotPort;
  resolveBubbleById?: ResolveBubbleByIdPort;
  resolveDeliveryMessageRef?: ResolveDeliveryMessageRefPort;
  writeStateSnapshot?: WriteStateSnapshotPort;
}
