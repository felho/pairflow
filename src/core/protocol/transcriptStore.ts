import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { parseEnvelopeLine, serializeEnvelopeLine } from "./envelope.js";
import { allocateNextProtocolSequence, TranscriptSequenceError } from "./sequenceAllocator.js";
import { assertValidProtocolEnvelope } from "./validators.js";
import { FileLockTimeoutError, withFileLock } from "../util/fileLock.js";
import type {
  ProtocolEnvelope,
  ProtocolEnvelopePayload,
  ProtocolMessageType,
  ProtocolParticipant
} from "../../types/protocol.js";

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
  lockPath: string;
  envelope: ProtocolEnvelopeDraft;
  now?: Date;
  lockTimeoutMs?: number;
}

export interface AppendProtocolEnvelopeResult {
  envelope: ProtocolEnvelope;
  sequence: number;
}

export interface ReadTranscriptOptions {
  allowMissing?: boolean;
  toleratePartialFinalLine?: boolean;
}

interface ParsedTranscript {
  envelopes: ProtocolEnvelope[];
  normalizedRaw: string;
  droppedTrailingPartialLine: boolean;
}

export class ProtocolTranscriptError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ProtocolTranscriptError";
  }
}

export class ProtocolTranscriptLockError extends ProtocolTranscriptError {
  public constructor(message: string) {
    super(message);
    this.name = "ProtocolTranscriptLockError";
  }
}

export class ProtocolTranscriptValidationError extends ProtocolTranscriptError {
  public constructor(message: string) {
    super(message);
    this.name = "ProtocolTranscriptValidationError";
  }
}

async function ensureDirForFile(path: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
}

async function readTranscriptRaw(
  transcriptPath: string,
  allowMissing: boolean
): Promise<string> {
  return readFile(transcriptPath, "utf8").catch((error: NodeJS.ErrnoException) => {
    if (allowMissing && error.code === "ENOENT") {
      return "";
    }
    throw error;
  });
}

function parseTranscript(raw: string, options: ReadTranscriptOptions): ParsedTranscript {
  const lines = raw.split(/\r?\n/u);
  const envelopes: ProtocolEnvelope[] = [];

  const toleratePartialFinalLine = options.toleratePartialFinalLine ?? true;
  const hasTrailingNewline = raw.endsWith("\n");

  let droppedTrailingPartialLine = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line === undefined || line.trim().length === 0) {
      continue;
    }

    try {
      envelopes.push(parseEnvelopeLine(line));
    } catch (error) {
      const isLastLine = index === lines.length - 1;
      const canDropTrailingPartialLine =
        toleratePartialFinalLine &&
        isLastLine &&
        !hasTrailingNewline &&
        error instanceof SyntaxError;

      if (canDropTrailingPartialLine) {
        droppedTrailingPartialLine = true;
        continue;
      }

      throw error;
    }
  }

  const normalizedRaw = envelopes.map((envelope) => serializeEnvelopeLine(envelope)).join("");

  return {
    envelopes,
    normalizedRaw,
    droppedTrailingPartialLine
  };
}

export async function readTranscriptEnvelopes(
  transcriptPath: string,
  options: ReadTranscriptOptions = {}
): Promise<ProtocolEnvelope[]> {
  const raw = await readTranscriptRaw(
    transcriptPath,
    options.allowMissing ?? true
  );

  return parseTranscript(raw, options).envelopes;
}

export async function readTranscriptEnvelopesOrThrow(
  transcriptPath: string,
  options: Omit<ReadTranscriptOptions, "allowMissing"> = {}
): Promise<ProtocolEnvelope[]> {
  return readTranscriptEnvelopes(transcriptPath, {
    ...options,
    allowMissing: false
  });
}

function ensureTranscriptBubbleConsistency(
  existing: readonly ProtocolEnvelope[],
  bubbleId: string
): void {
  for (const envelope of existing) {
    if (envelope.bubble_id !== bubbleId) {
      throw new ProtocolTranscriptValidationError(
        `Transcript contains envelope for different bubble: expected ${bubbleId}, found ${envelope.bubble_id}`
      );
    }
  }
}

function buildValidatedEnvelope(
  draft: ProtocolEnvelopeDraft,
  id: string,
  now: Date
): ProtocolEnvelope {
  return assertValidProtocolEnvelope({
    ...draft,
    id,
    ts: now.toISOString()
  });
}

function mapTranscriptProcessingError(error: unknown): never {
  if (error instanceof TranscriptSequenceError) {
    throw new ProtocolTranscriptValidationError(error.message);
  }

  if (error instanceof ProtocolTranscriptError) {
    throw error;
  }

  if (error instanceof Error) {
    throw new ProtocolTranscriptValidationError(error.message);
  }

  throw error;
}

export async function appendProtocolEnvelope(
  input: AppendProtocolEnvelopeInput
): Promise<AppendProtocolEnvelopeResult> {
  try {
    return await withFileLock(
      {
        lockPath: input.lockPath,
        timeoutMs: input.lockTimeoutMs ?? 5_000,
        ensureParentDir: true
      },
      async () => {
        const now = input.now ?? new Date();

        await ensureDirForFile(input.transcriptPath);
        const raw = await readTranscriptRaw(input.transcriptPath, true);
        const parsed = parseTranscript(raw, {
          allowMissing: true,
          toleratePartialFinalLine: true
        });

        if (parsed.droppedTrailingPartialLine) {
          // Recovery mode: truncate the syntactically broken tail first, then append
          // the new line below. A crash between these writes may shorten transcript
          // by one invalid partial line, but keeps it parseable and append-safe.
          await writeFile(input.transcriptPath, parsed.normalizedRaw, {
            encoding: "utf8"
          });
        }

        const existing = parsed.envelopes;
        ensureTranscriptBubbleConsistency(existing, input.envelope.bubble_id);

        const allocation = allocateNextProtocolSequence(existing, now);
        const envelope = buildValidatedEnvelope(input.envelope, allocation.messageId, now);
        const line = serializeEnvelopeLine(envelope);

        await appendFile(input.transcriptPath, line, { encoding: "utf8" });

        return {
          envelope,
          sequence: allocation.sequence
        };
      }
    );
  } catch (error) {
    if (error instanceof FileLockTimeoutError) {
      throw new ProtocolTranscriptLockError(
        `Could not acquire protocol lock within timeout: ${input.lockPath}`
      );
    }

    mapTranscriptProcessingError(error);
  }
}
