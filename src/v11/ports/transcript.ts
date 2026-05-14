import type {
  ProtocolEnvelopeDraft,
  ProtocolEnvelope
} from "../shared/protocol/protocolEnvelopeContract.js";
import type { ProtocolMessageType } from "../../contracts/kernel/protocol.js";
export type { ProtocolEnvelopeDraft };

export interface AppendProtocolEnvelopeInput<
  TType extends ProtocolMessageType = ProtocolMessageType
> {
  transcriptPath: string;
  mirrorPaths?: string[];
  lockPath: string;
  envelope: ProtocolEnvelopeDraft<TType>;
  now?: Date;
  lockTimeoutMs?: number;
}

export interface ProtocolMirrorWriteFailure {
  path: string;
  message: string;
  code?: string;
}

export interface AppendProtocolEnvelopeResult<
  TType extends ProtocolMessageType = ProtocolMessageType
> {
  envelope: ProtocolEnvelope<TType>;
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

export type AppendProtocolEnvelopePort = <
  TType extends ProtocolMessageType
>(
  input: AppendProtocolEnvelopeInput<TType>
) => Promise<AppendProtocolEnvelopeResult<TType>>;
