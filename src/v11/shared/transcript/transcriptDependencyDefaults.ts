type AppendProtocolEnvelopePort =
  typeof import("../../../core/protocol/transcriptStore.js").appendProtocolEnvelope;
type ReadTranscriptEnvelopesPort =
  typeof import("../../../core/protocol/transcriptStore.js").readTranscriptEnvelopes;

export type AppendProtocolEnvelopeResult =
  import("../../../core/protocol/transcriptStore.js").AppendProtocolEnvelopeResult;

let transcriptStoreModulePromise:
  | Promise<typeof import("../../../core/protocol/transcriptStore.js")>
  | undefined;

async function loadTranscriptStoreModule() {
  transcriptStoreModulePromise ??= import(
    "../../../core/protocol/transcriptStore.js"
  );
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
