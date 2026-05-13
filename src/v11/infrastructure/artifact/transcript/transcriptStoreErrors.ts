import type {
  ProtocolEnvelope
} from "../../../shared/protocol/protocolEnvelopeContract.js";
import type { ProtocolEnvelopeDraft } from "../../../ports/transcript.js";
import {
  assertValidProtocolEnvelope
} from "../../../shared/protocol/validators.js";
import {
  TranscriptSequenceError
} from "../../../shared/protocol/sequenceAllocator.js";

export interface ProtocolTranscriptErrorContext {
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

export function toProtocolTranscriptValidationError(input: {
  message: string;
  context: ProtocolTranscriptErrorContext;
  cause?: unknown;
}): ProtocolTranscriptValidationError {
  return new ProtocolTranscriptValidationError(input.message, {
    context: input.context,
    ...(input.cause !== undefined ? { cause: input.cause } : {})
  });
}

export function toProtocolTranscriptLockError(input: {
  message: string;
  context: ProtocolTranscriptErrorContext;
  cause?: unknown;
}): ProtocolTranscriptLockError {
  return new ProtocolTranscriptLockError(input.message, {
    context: input.context,
    ...(input.cause !== undefined ? { cause: input.cause } : {})
  });
}

export function ensureTranscriptBubbleConsistency(
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

export function buildValidatedEnvelope(
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

export function mapTranscriptProcessingError(
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
