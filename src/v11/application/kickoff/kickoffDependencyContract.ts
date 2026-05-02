import type { ProtocolEnvelopeDraft } from "../../../types/protocol.js";
import type {
  EmitDeliveryNotificationAckPort
} from "../../shared/ports/tmuxDelivery.js";
import type {
  ResolveBubbleByIdPort
} from "../../shared/ports/bubbleLookup.js";
import type {
  ReadStateSnapshotPort,
  WriteStateSnapshotPort
} from "../../shared/ports/stateSnapshots.js";
import type { AppendProtocolEnvelopePort } from "../../shared/ports/transcript.js";

export type KickoffReadFile = (
  path: string,
  encoding: "utf8"
) => Promise<string>;

export type KickoffWriteFile = (
  path: string,
  data: string,
  options: { encoding: "utf8" }
) => Promise<unknown>;

export interface KickoffStatResult {
  isFile(): boolean;
}

export type KickoffStatFile = (
  path: string
) => Promise<KickoffStatResult>;

export type KickoffEmitDelivery = EmitDeliveryNotificationAckPort;

export interface KickoffDependencyOverrides {
  resolveBubbleById?: ResolveBubbleByIdPort;
  readStateSnapshot?: ReadStateSnapshotPort;
  writeStateSnapshot?: WriteStateSnapshotPort;
  readFile?: KickoffReadFile;
  statFile?: KickoffStatFile;
  writeFile?: KickoffWriteFile;
  appendProtocolEnvelope?: AppendProtocolEnvelopePort;
  emitDeliveryNotificationAck?: KickoffEmitDelivery;
}

export interface ResolvedKickoffDependencies {
  resolveBubble: ResolveBubbleByIdPort;
  readState: ReadStateSnapshotPort;
  writeState: WriteStateSnapshotPort;
  readFileFn: KickoffReadFile;
  statFileFn: KickoffStatFile;
  writeFileFn: KickoffWriteFile;
  appendEnvelope: AppendProtocolEnvelopePort;
  emitDelivery: KickoffEmitDelivery;
}

export type KickoffProtocolEnvelopeDraft = ProtocolEnvelopeDraft;
