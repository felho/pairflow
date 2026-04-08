import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { parseEnvelopeLine, serializeEnvelopeLine } from "../../../shared/protocol/envelope.js";
import {
  allocateNextProtocolSequence,
  TranscriptSequenceError
} from "../../../shared/protocol/sequenceAllocator.js";
import { assertValidProtocolEnvelope } from "../../../shared/protocol/validators.js";
import {
  FileLockTimeoutError,
  withFileLock
} from "../../foundation/fs/fileLock.js";
import type { ProtocolEnvelope } from "../../../../types/protocol.js";
import type {
  AppendProtocolEnvelopeInput,
  AppendProtocolEnvelopePort,
  AppendProtocolEnvelopeResult,
  ProtocolEnvelopeDraft,
  ProtocolMirrorWriteFailure,
  ReadTranscriptEnvelopesPort,
  ReadTranscriptOptions
} from "../../../shared/ports/transcript.js";

export type {
  AppendProtocolEnvelopeInput,
  AppendProtocolEnvelopePort,
  AppendProtocolEnvelopeResult,
  ProtocolEnvelopeDraft,
  ProtocolMirrorWriteFailure,
  ReadTranscriptEnvelopesPort,
  ReadTranscriptOptions
} from "../../../shared/ports/transcript.js";

export interface AppendProtocolEnvelopeBatchEntry {
  envelope: ProtocolEnvelopeDraft;
  mirrorPaths?: string[] | undefined;
}

export interface AppendProtocolEnvelopesInput {
  transcriptPath: string;
  lockPath: string;
  entries: AppendProtocolEnvelopeBatchEntry[];
  now?: Date | undefined;
  lockTimeoutMs?: number | undefined;
}

export interface AppendProtocolEnvelopesResult {
  entries: AppendProtocolEnvelopeResult[];
}

interface ParsedTranscript {
  envelopes: ProtocolEnvelope[];
  normalizedRaw: string;
  droppedTrailingPartialLine: boolean;
  droppedInvalidEnvelopeLines: number;
}

interface ProtocolTranscriptErrorContext {
  bubbleId?: string | undefined;
  entryCount?: number | undefined;
  foundBubbleId?: string | undefined;
  lockPath?: string | undefined;
  reason?: string | undefined;
  transcriptPath?: string | undefined;
}

interface ProtocolTranscriptErrorOptions extends ErrorOptions {
  context?: ProtocolTranscriptErrorContext | undefined;
}

export class ProtocolTranscriptError extends Error {
  public readonly context: ProtocolTranscriptErrorContext | undefined;

  public constructor(message: string, options?: ProtocolTranscriptErrorOptions) {
    super(message, options);
    this.name = "ProtocolTranscriptError";
    this.context = options?.context;
  }
}

export class ProtocolTranscriptLockError extends ProtocolTranscriptError {
  public constructor(message: string, options?: ProtocolTranscriptErrorOptions) {
    super(message, options);
    this.name = "ProtocolTranscriptLockError";
  }
}

export class ProtocolTranscriptValidationError extends ProtocolTranscriptError {
  public constructor(message: string, options?: ProtocolTranscriptErrorOptions) {
    super(message, options);
    this.name = "ProtocolTranscriptValidationError";
  }
}

function toProtocolTranscriptValidationError(input: {
  message: string;
  context: ProtocolTranscriptErrorContext;
  cause?: unknown;
}): ProtocolTranscriptValidationError {
  return new ProtocolTranscriptValidationError(input.message, {
    context: input.context,
    ...(input.cause !== undefined ? { cause: input.cause } : {})
  });
}

function toProtocolTranscriptLockError(input: {
  message: string;
  context: ProtocolTranscriptErrorContext;
  cause?: unknown;
}): ProtocolTranscriptLockError {
  return new ProtocolTranscriptLockError(input.message, {
    context: input.context,
    ...(input.cause !== undefined ? { cause: input.cause } : {})
  });
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
  const tolerateInvalidEnvelopeLines = options.tolerateInvalidEnvelopeLines ?? false;
  const hasTrailingNewline = raw.endsWith("\n");

  let droppedTrailingPartialLine = false;
  let droppedInvalidEnvelopeLines = 0;

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

      if (
        tolerateInvalidEnvelopeLines &&
        error instanceof Error &&
        /Invalid protocol envelope/u.test(error.message)
      ) {
        droppedInvalidEnvelopeLines += 1;
        continue;
      }

      throw error;
    }
  }

  const normalizedRaw = envelopes.map((envelope) => serializeEnvelopeLine(envelope)).join("");

  return {
    envelopes,
    normalizedRaw,
    droppedTrailingPartialLine,
    droppedInvalidEnvelopeLines
  };
}

export const readTranscriptEnvelopes: ReadTranscriptEnvelopesPort = async (
  transcriptPath: string,
  options: ReadTranscriptOptions = {}
): Promise<ProtocolEnvelope[]> => {
  const raw = await readTranscriptRaw(
    transcriptPath,
    options.allowMissing ?? true
  );

  return parseTranscript(raw, options).envelopes;
};

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
      throw toProtocolTranscriptValidationError({
        message: `Transcript contains envelope for different bubble: expected ${bubbleId}, found ${envelope.bubble_id}`,
        context: {
          bubbleId,
          foundBubbleId: envelope.bubble_id,
          reason: "transcript_bubble_mismatch"
        }
      });
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

function mapTranscriptProcessingError(
  error: unknown,
  context: ProtocolTranscriptErrorContext
): never {
  if (error instanceof TranscriptSequenceError) {
    throw toProtocolTranscriptValidationError({
      message: error.message,
      context: {
        ...context,
        reason: "sequence_error"
      },
      cause: error
    });
  }

  if (error instanceof ProtocolTranscriptError) {
    throw error;
  }

  if (error instanceof Error) {
    throw toProtocolTranscriptValidationError({
      message: error.message,
      context: {
        ...context,
        reason: "unexpected_transcript_processing_error"
      },
      cause: error
    });
  }

  throw error;
}

function toMirrorWriteFailure(
  mirrorPath: string,
  error: unknown
): ProtocolMirrorWriteFailure {
  if (error instanceof Error) {
    const typedError = error as NodeJS.ErrnoException;
    return {
      path: mirrorPath,
      message: error.message,
      ...(typedError.code !== undefined ? { code: typedError.code } : {})
    };
  }

  return {
    path: mirrorPath,
    message: String(error)
  };
}

export const appendProtocolEnvelope: AppendProtocolEnvelopePort = async (
  input: AppendProtocolEnvelopeInput
): Promise<AppendProtocolEnvelopeResult> => {
  const batchResult = await appendProtocolEnvelopes({
    transcriptPath: input.transcriptPath,
    lockPath: input.lockPath,
    entries: [
      {
        envelope: input.envelope,
        mirrorPaths: input.mirrorPaths
      }
    ],
    now: input.now,
    lockTimeoutMs: input.lockTimeoutMs
  });

  const first = batchResult.entries[0];
  if (first === undefined) {
    throw toProtocolTranscriptValidationError({
      message: "Batch append unexpectedly returned no entry.",
      context: {
        lockPath: input.lockPath,
        reason: "batch_append_missing_result",
        transcriptPath: input.transcriptPath
      }
    });
  }

  return first;
};

async function appendProtocolEnvelopesLocked(
  input: AppendProtocolEnvelopesInput
): Promise<AppendProtocolEnvelopeResult[]> {
  const now = input.now ?? new Date();

  await ensureDirForFile(input.transcriptPath);
  const raw = await readTranscriptRaw(input.transcriptPath, true);
  const parsed = parseTranscript(raw, {
    allowMissing: true,
    toleratePartialFinalLine: true,
    tolerateInvalidEnvelopeLines: true
  });

  if (
    parsed.droppedTrailingPartialLine
    || parsed.droppedInvalidEnvelopeLines > 0
  ) {
    // Recovery mode: normalize away parse-invalid tail content and any
    // legacy/forward-incompatible envelope lines before appending. This
    // keeps sequence allocation deterministic and future mutations append-safe.
    await writeFile(input.transcriptPath, parsed.normalizedRaw, {
      encoding: "utf8"
    });
  }

  const existing = [...parsed.envelopes];
  const firstEntry = input.entries[0];
  if (firstEntry === undefined) {
    throw toProtocolTranscriptValidationError({
      message: "appendProtocolEnvelopes requires at least one entry.",
      context: {
        entryCount: input.entries.length,
        lockPath: input.lockPath,
        reason: "missing_first_batch_entry",
        transcriptPath: input.transcriptPath
      }
    });
  }

  const bubbleId = firstEntry.envelope.bubble_id;
  ensureTranscriptBubbleConsistency(existing, bubbleId);
  for (const entry of input.entries) {
    if (entry.envelope.bubble_id !== bubbleId) {
      throw toProtocolTranscriptValidationError({
        message: `Batch append cannot mix bubble ids: expected ${bubbleId}, found ${entry.envelope.bubble_id}`,
        context: {
          bubbleId,
          foundBubbleId: entry.envelope.bubble_id,
          lockPath: input.lockPath,
          reason: "mixed_batch_bubble_ids",
          transcriptPath: input.transcriptPath
        }
      });
    }
  }

  const lines: string[] = [];
  const results: AppendProtocolEnvelopeResult[] = [];
  for (const entry of input.entries) {
    const allocation = allocateNextProtocolSequence(existing, now);
    const envelope = buildValidatedEnvelope(
      entry.envelope,
      allocation.messageId,
      now
    );
    existing.push(envelope);
    lines.push(serializeEnvelopeLine(envelope));
    results.push({
      envelope,
      sequence: allocation.sequence,
      mirrorWriteFailures: []
    });
  }

  await appendFile(input.transcriptPath, lines.join(""), {
    encoding: "utf8"
  });

  for (let index = 0; index < input.entries.length; index += 1) {
    const entry = input.entries[index];
    const line = lines[index];
    const result = results[index];
    if (entry === undefined || line === undefined || result === undefined) {
      continue;
    }

    for (const mirrorPath of entry.mirrorPaths ?? []) {
      try {
        await ensureDirForFile(mirrorPath);
        await appendFile(mirrorPath, line, { encoding: "utf8" });
      } catch (error) {
        result.mirrorWriteFailures.push(toMirrorWriteFailure(mirrorPath, error));
      }
    }
  }

  return results;
}

export async function appendProtocolEnvelopes(
  input: AppendProtocolEnvelopesInput
): Promise<AppendProtocolEnvelopesResult> {
  if (input.entries.length === 0) {
    throw toProtocolTranscriptValidationError({
      message: "appendProtocolEnvelopes requires at least one entry.",
      context: {
        entryCount: 0,
        lockPath: input.lockPath,
        reason: "empty_append_batch",
        transcriptPath: input.transcriptPath
      }
    });
  }

  try {
    const entries = await withFileLock(
      {
        lockPath: input.lockPath,
        timeoutMs: input.lockTimeoutMs ?? 5_000,
        ensureParentDir: true
      },
      () => appendProtocolEnvelopesLocked(input)
    );

    return { entries };
  } catch (error) {
    if (error instanceof FileLockTimeoutError) {
      throw toProtocolTranscriptLockError({
        message: `Could not acquire protocol lock within timeout: ${input.lockPath}`,
        context: {
          entryCount: input.entries.length,
          lockPath: input.lockPath,
          reason: "lock_timeout",
          transcriptPath: input.transcriptPath
        },
        cause: error
      });
    }

    mapTranscriptProcessingError(error, {
      entryCount: input.entries.length,
      lockPath: input.lockPath,
      transcriptPath: input.transcriptPath
    });
  }
}
