import type { ProtocolEnvelopeDraft } from "../../../types/protocol.js";
import type { resolveBubbleById } from "../../../core/bubble/bubbleLookup.js";
import type {
  readStateSnapshot,
  writeStateSnapshot
} from "../../../core/state/stateStore.js";
import type { appendProtocolEnvelope } from "../../../core/protocol/transcriptStore.js";
import type { emitTmuxDeliveryNotification } from "../../../core/runtime/tmuxDelivery.js";

export type KickoffReadFile = (
  path: string,
  encoding: "utf8"
) => Promise<string>;

export type KickoffWriteFile = (
  path: string,
  data: string,
  options: { encoding: "utf8" }
) => Promise<unknown>;

export interface KickoffDependencyOverrides {
  resolveBubbleById?: typeof resolveBubbleById;
  readStateSnapshot?: typeof readStateSnapshot;
  writeStateSnapshot?: typeof writeStateSnapshot;
  readFile?: KickoffReadFile;
  writeFile?: KickoffWriteFile;
  appendProtocolEnvelope?: typeof appendProtocolEnvelope;
  emitTmuxDeliveryNotification?: typeof emitTmuxDeliveryNotification;
}

export interface ResolvedKickoffDependencies {
  resolveBubble: typeof resolveBubbleById;
  readState: typeof readStateSnapshot;
  writeState: typeof writeStateSnapshot;
  readFileFn: KickoffReadFile;
  writeFileFn: KickoffWriteFile;
  appendEnvelope: typeof appendProtocolEnvelope;
  emitDelivery: typeof emitTmuxDeliveryNotification;
}

export type KickoffProtocolEnvelopeDraft = ProtocolEnvelopeDraft;
