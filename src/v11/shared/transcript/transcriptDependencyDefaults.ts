import {
  appendProtocolEnvelope as appendProtocolEnvelopeCore,
  readTranscriptEnvelopes as readTranscriptEnvelopesCore
} from "../../../core/protocol/transcriptStore.js";
import type {
  AppendProtocolEnvelopePort,
  ReadTranscriptEnvelopesPort
} from "../ports/transcript.js";

export type { AppendProtocolEnvelopeResult } from "../ports/transcript.js";

export async function appendProtocolEnvelope(
  ...args: Parameters<AppendProtocolEnvelopePort>
): Promise<Awaited<ReturnType<AppendProtocolEnvelopePort>>> {
  return appendProtocolEnvelopeCore(...args);
}

export async function readTranscriptEnvelopes(
  ...args: Parameters<ReadTranscriptEnvelopesPort>
): Promise<Awaited<ReturnType<ReadTranscriptEnvelopesPort>>> {
  return readTranscriptEnvelopesCore(...args);
}
