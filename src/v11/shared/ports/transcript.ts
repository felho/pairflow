import type {
  ProtocolEnvelope,
  ProtocolEnvelopePayload,
  ProtocolMessageType,
  ProtocolParticipant
} from "../../../types/protocol.js";

export interface ProtocolEnvelopeDraft {
  bubble_id: string;
  sender: ProtocolParticipant;
  recipient: ProtocolParticipant;
  type: ProtocolMessageType;
  round: number;
  payload: ProtocolEnvelopePayload;
  refs: string[];
}

export interface AppendProtocolEnvelopeInput {
  transcriptPath: string;
  mirrorPaths?: string[];
  lockPath: string;
  envelope: ProtocolEnvelopeDraft;
  now?: Date;
  lockTimeoutMs?: number;
}

export interface ProtocolMirrorWriteFailure {
  path: string;
  message: string;
  code?: string;
}

export interface AppendProtocolEnvelopeResult {
  envelope: ProtocolEnvelope;
  sequence: number;
  mirrorWriteFailures: ProtocolMirrorWriteFailure[];
}

export type AppendProtocolEnvelopePort = (
  input: AppendProtocolEnvelopeInput
) => Promise<AppendProtocolEnvelopeResult>;
