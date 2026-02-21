import { assertValidProtocolEnvelope } from "./validators.js";
import type { ProtocolEnvelope } from "../../types/protocol.js";

export function parseEnvelopeLine(line: string): ProtocolEnvelope {
  const trimmed = line.trim();
  if (trimmed.length === 0) {
    throw new Error("Cannot parse an empty NDJSON line");
  }

  const parsed = JSON.parse(trimmed) as unknown;
  return assertValidProtocolEnvelope(parsed);
}

export function serializeEnvelopeLine(envelope: ProtocolEnvelope): string {
  const validated = assertValidProtocolEnvelope(envelope);
  return `${JSON.stringify(validated)}\n`;
}
