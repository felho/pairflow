import type { ProtocolEnvelope } from "./protocolEnvelopeContract.js";

const messageIdPattern = /^msg_(\d{8})_(\d+)$/u;

export interface ProtocolSequenceAllocation {
  sequence: number;
  messageId: string;
}

export interface ProtocolSequenceAllocationOptions {
  strictAudit?: boolean;
}

export interface TranscriptSequenceErrorContext {
  source:
    | "parse_envelope_id"
    | "allocate_fast_path"
    | "strict_audit_duplicate"
    | "strict_audit_gap";
  reason:
    | "invalid_id_format"
    | "invalid_sequence"
    | "unexpected_empty_tail"
    | "duplicate_sequence"
    | "sequence_gap";
  envelopeId?: string | undefined;
  sequence?: number | undefined;
}

export class TranscriptSequenceError extends Error {
  public readonly context: TranscriptSequenceErrorContext | undefined;

  public constructor(
    input:
      | string
      | {
        message: string;
        context?: TranscriptSequenceErrorContext | undefined;
      }
  ) {
    const normalized =
      typeof input === "string" ? { message: input, context: undefined } : input;
    super(normalized.message);
    this.name = "TranscriptSequenceError";
    this.context = normalized.context;
  }
}

function parseSequenceFromEnvelopeId(id: string): number {
  const match = messageIdPattern.exec(id);
  if (match === null) {
    throw new TranscriptSequenceError({
      message: `Invalid envelope id format in transcript: ${id}`,
      context: {
        source: "parse_envelope_id",
        reason: "invalid_id_format",
        envelopeId: id
      }
    });
  }

  const sequenceText = match[2];
  if (sequenceText === undefined) {
    throw new TranscriptSequenceError({
      message: `Invalid envelope id format in transcript: ${id}`,
      context: {
        source: "parse_envelope_id",
        reason: "invalid_id_format",
        envelopeId: id
      }
    });
  }

  const sequence = Number.parseInt(sequenceText, 10);
  if (!Number.isSafeInteger(sequence) || sequence <= 0) {
    throw new TranscriptSequenceError({
      message: `Invalid envelope sequence in transcript id: ${id}`,
      context: {
        source: "parse_envelope_id",
        reason: "invalid_sequence",
        envelopeId: id
      }
    });
  }

  return sequence;
}

function formatDatePart(now: Date): string {
  const year = now.getUTCFullYear().toString().padStart(4, "0");
  const month = (now.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = now.getUTCDate().toString().padStart(2, "0");
  return `${year}${month}${day}`;
}

export function formatProtocolEnvelopeId(now: Date, sequence: number): string {
  const datePart = formatDatePart(now);
  const sequencePart = sequence.toString().padStart(3, "0");
  return `msg_${datePart}_${sequencePart}`;
}

export function allocateNextProtocolSequence(
  envelopes: readonly ProtocolEnvelope[],
  now: Date = new Date(),
  options: ProtocolSequenceAllocationOptions = {}
): ProtocolSequenceAllocation {
  if (envelopes.length === 0) {
    return {
      sequence: 1,
      messageId: formatProtocolEnvelopeId(now, 1)
    };
  }

  if (!options.strictAudit) {
    const lastEnvelope = envelopes[envelopes.length - 1];
    if (lastEnvelope === undefined) {
      throw new TranscriptSequenceError({
        message: "Transcript envelope list is unexpectedly empty",
        context: {
          source: "allocate_fast_path",
          reason: "unexpected_empty_tail"
        }
      });
    }
    const nextSequence = parseSequenceFromEnvelopeId(lastEnvelope.id) + 1;
    return {
      sequence: nextSequence,
      messageId: formatProtocolEnvelopeId(now, nextSequence)
    };
  }

  const seenSequences = new Set<number>();
  let maxSequence = 0;

  for (const envelope of envelopes) {
    const sequence = parseSequenceFromEnvelopeId(envelope.id);
    if (seenSequences.has(sequence)) {
      throw new TranscriptSequenceError({
        message: `Duplicate envelope sequence in transcript: ${sequence}`,
        context: {
          source: "strict_audit_duplicate",
          reason: "duplicate_sequence",
          sequence
        }
      });
    }
    seenSequences.add(sequence);
    if (sequence > maxSequence) {
      maxSequence = sequence;
    }
  }

  for (let sequence = 1; sequence <= maxSequence; sequence += 1) {
    if (!seenSequences.has(sequence)) {
      throw new TranscriptSequenceError({
        message: `Transcript sequence gap detected before next allocation: missing ${sequence}`,
        context: {
          source: "strict_audit_gap",
          reason: "sequence_gap",
          sequence
        }
      });
    }
  }

  const nextSequence = maxSequence + 1;
  return {
    sequence: nextSequence,
    messageId: formatProtocolEnvelopeId(now, nextSequence)
  };
}
