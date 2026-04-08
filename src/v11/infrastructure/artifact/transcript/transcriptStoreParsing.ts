import { mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { ProtocolEnvelope } from "../../../../types/protocol.js";
import { parseEnvelopeLine, serializeEnvelopeLine } from "../../../shared/protocol/envelope.js";
import type { ReadTranscriptOptions } from "../../../shared/ports/transcript.js";

export interface ParsedTranscript {
  envelopes: ProtocolEnvelope[];
  normalizedRaw: string;
  droppedTrailingPartialLine: boolean;
  droppedInvalidEnvelopeLines: number;
}

export async function ensureDirForFile(path: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
}

export async function readTranscriptRaw(
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

export function parseTranscript(raw: string, options: ReadTranscriptOptions): ParsedTranscript {
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
