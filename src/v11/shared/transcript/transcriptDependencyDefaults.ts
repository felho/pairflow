import type {
  AppendProtocolEnvelopePort,
  AppendProtocolEnvelopeResult,
  ReadTranscriptEnvelopesPort
} from "../ports/transcript.js";

export type { AppendProtocolEnvelopeResult };

interface TranscriptDependencyDefaultsModule {
  appendProtocolEnvelope: AppendProtocolEnvelopePort;
  readTranscriptEnvelopes: ReadTranscriptEnvelopesPort;
}

let transcriptDependencyDefaultsModulePromise:
  | Promise<TranscriptDependencyDefaultsModule>
  | undefined;

function getTranscriptDependencyDefaultsModulePath(): string {
  return "../../defaults/transcript/transcriptDependencyDefaults.js";
}

async function loadTranscriptDependencyDefaultsModule():
  Promise<TranscriptDependencyDefaultsModule> {
  transcriptDependencyDefaultsModulePromise ??= import(
    getTranscriptDependencyDefaultsModulePath()
  ) as Promise<TranscriptDependencyDefaultsModule>;
  return transcriptDependencyDefaultsModulePromise;
}

export const appendProtocolEnvelope:
  AppendProtocolEnvelopePort = async (...args) => {
    const { appendProtocolEnvelope: appendProtocolEnvelopeDefault } =
      await loadTranscriptDependencyDefaultsModule();
    return appendProtocolEnvelopeDefault(...args);
  };

export const readTranscriptEnvelopes:
  ReadTranscriptEnvelopesPort = async (...args) => {
    const { readTranscriptEnvelopes: readTranscriptEnvelopesDefault } =
      await loadTranscriptDependencyDefaultsModule();
    return readTranscriptEnvelopesDefault(...args);
  };
