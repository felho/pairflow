import type {
  ProtocolEnvelopeDraft,
  ProtocolEnvelope
} from "../../types/protocol.js";
export type { ProtocolEnvelopeDraft };

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

export interface ReadTranscriptOptions {
  allowMissing?: boolean;
  toleratePartialFinalLine?: boolean;
  tolerateInvalidEnvelopeLines?: boolean;
}

export type ReadTranscriptEnvelopesPort = (
  transcriptPath: string,
  options?: ReadTranscriptOptions
) => Promise<ProtocolEnvelope[]>;

export type AppendProtocolEnvelopePort = (
  input: AppendProtocolEnvelopeInput
) => Promise<AppendProtocolEnvelopeResult>;
