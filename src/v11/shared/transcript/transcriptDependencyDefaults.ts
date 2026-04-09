import type {
  AppendProtocolEnvelopePort,
  ReadTranscriptEnvelopesPort
} from "../ports/transcript.js";

export type { AppendProtocolEnvelopeResult } from "../ports/transcript.js";

let transcriptStoreModulePromise:
  | Promise<{
      appendProtocolEnvelope: AppendProtocolEnvelopePort;
      readTranscriptEnvelopes: ReadTranscriptEnvelopesPort;
    }>
  | undefined;

async function loadTranscriptStoreModule(): Promise<{
  appendProtocolEnvelope: AppendProtocolEnvelopePort;
  readTranscriptEnvelopes: ReadTranscriptEnvelopesPort;
}> {
  transcriptStoreModulePromise ??= import(
    "../../../core/protocol/transcriptStore.js"
  ).then(({ appendProtocolEnvelope, readTranscriptEnvelopes }) => ({
    appendProtocolEnvelope,
    readTranscriptEnvelopes
  }));
  return transcriptStoreModulePromise;
}

export async function appendProtocolEnvelope(
  ...args: Parameters<AppendProtocolEnvelopePort>
): Promise<Awaited<ReturnType<AppendProtocolEnvelopePort>>> {
  const { appendProtocolEnvelope } = await loadTranscriptStoreModule();
  return appendProtocolEnvelope(...args);
}

export async function readTranscriptEnvelopes(
  ...args: Parameters<ReadTranscriptEnvelopesPort>
): Promise<Awaited<ReturnType<ReadTranscriptEnvelopesPort>>> {
  const { readTranscriptEnvelopes } = await loadTranscriptStoreModule();
  return readTranscriptEnvelopes(...args);
}
