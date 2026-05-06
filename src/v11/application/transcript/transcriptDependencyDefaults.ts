import type {
  AppendProtocolEnvelopePort,
  AppendProtocolEnvelopeResult,
  ReadTranscriptEnvelopesPort
} from "../../shared/ports/transcript.js";

interface TranscriptDefaultsModule {
  appendProtocolEnvelope: AppendProtocolEnvelopePort;
  readTranscriptEnvelopes: ReadTranscriptEnvelopesPort;
}

let transcriptDefaultsModulePromise:
  | Promise<TranscriptDefaultsModule>
  | undefined;

function getTranscriptDefaultsModulePath(): string {
  return "../../defaults/transcript/transcriptDependencyDefaults.js";
}

async function loadTranscriptDefaultsModule():
  Promise<TranscriptDefaultsModule> {
  transcriptDefaultsModulePromise ??= import(
    getTranscriptDefaultsModulePath()
  ) as Promise<TranscriptDefaultsModule>;
  return transcriptDefaultsModulePromise;
}

export const appendProtocolEnvelope:
  AppendProtocolEnvelopePort = async (...args) => {
    const { appendProtocolEnvelope: appendProtocolEnvelopeDefault } =
      await loadTranscriptDefaultsModule();
    return appendProtocolEnvelopeDefault(...args);
  };

export const readTranscriptEnvelopes:
  ReadTranscriptEnvelopesPort = async (...args) => {
    const { readTranscriptEnvelopes: readTranscriptEnvelopesDefault } =
      await loadTranscriptDefaultsModule();
    return readTranscriptEnvelopesDefault(...args);
  };

export type { AppendProtocolEnvelopeResult };
