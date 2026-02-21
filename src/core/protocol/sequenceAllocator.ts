import type { ProtocolEnvelope } from "../../types/protocol.js";

const messageIdPattern = /^msg_(\d{8})_(\d+)$/u;

export interface ProtocolSequenceAllocation {
  sequence: number;
  messageId: string;
}

export interface ProtocolSequenceAllocationOptions {
  strictAudit?: boolean;
}

export class TranscriptSequenceError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "TranscriptSequenceError";
  }
}

function parseSequenceFromEnvelopeId(id: string): number {
  const match = messageIdPattern.exec(id);
  if (match === null) {
    throw new TranscriptSequenceError(
      `Invalid envelope id format in transcript: ${id}`
    );
  }

  const sequenceText = match[2];
  if (sequenceText === undefined) {
    throw new TranscriptSequenceError(
      `Invalid envelope id format in transcript: ${id}`
    );
  }

  const sequence = Number.parseInt(sequenceText, 10);
  if (!Number.isSafeInteger(sequence) || sequence <= 0) {
    throw new TranscriptSequenceError(
      `Invalid envelope sequence in transcript id: ${id}`
    );
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
      throw new TranscriptSequenceError("Transcript envelope list is unexpectedly empty");
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
      throw new TranscriptSequenceError(
        `Duplicate envelope sequence in transcript: ${sequence}`
      );
    }
    seenSequences.add(sequence);
    if (sequence > maxSequence) {
      maxSequence = sequence;
    }
  }

  for (let sequence = 1; sequence <= maxSequence; sequence += 1) {
    if (!seenSequences.has(sequence)) {
      throw new TranscriptSequenceError(
        `Transcript sequence gap detected before next allocation: missing ${sequence}`
      );
    }
  }

  const nextSequence = maxSequence + 1;
  return {
    sequence: nextSequence,
    messageId: formatProtocolEnvelopeId(now, nextSequence)
  };
}
