import type { ProtocolEnvelopeDraft } from "../../../../../types/protocol.js";
import type {
  EmitDeliveryNotificationAckPort
} from "../../../../ports/tmuxDelivery.js";
import type {
  ResolveBubbleByIdPort
} from "../../../../ports/bubbleLookup.js";
import type {
  ReadDomainStateSnapshotPort,
  ReadStateSnapshotPort,
  WriteDomainStateSnapshotPort,
  WriteStateSnapshotPort
} from "../../../../ports/stateSnapshots.js";
import type { AppendProtocolEnvelopePort } from "../../../../ports/transcript.js";

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
  readState: ReadDomainStateSnapshotPort;
  writeState: WriteDomainStateSnapshotPort;
  readFileFn: KickoffReadFile;
  statFileFn: KickoffStatFile;
  writeFileFn: KickoffWriteFile;
  appendEnvelope: AppendProtocolEnvelopePort;
  emitDelivery: KickoffEmitDelivery;
}

export type KickoffProtocolEnvelopeDraft = ProtocolEnvelopeDraft;
