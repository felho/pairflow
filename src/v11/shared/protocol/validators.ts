import {
  assertValidation,
  isInteger,
  isIsoTimestamp,
  isNonEmptyString,
  isRecord,
  validationFail,
  validationOk,
  type ValidationError,
  type ValidationResult
} from "../validation/primitives.js";
import {
  protocolMessageTypes,
  isProtocolMessageType,
  isProtocolParticipant
} from "../../../contracts/kernel/protocol.js";
import type { ProtocolEnvelope } from "./protocolEnvelopeContract.js";
import { validatePayloadByType } from "./protocolPayloadValidation.js";

export function validateProtocolEnvelope(
  input: unknown
): ValidationResult<ProtocolEnvelope> {
  const errors: ValidationError[] = [];
  if (!isRecord(input)) {
    return validationFail([{ path: "$", message: "Envelope must be an object" }]);
  }

  const id = input.id;
  if (!isNonEmptyString(id)) {
    errors.push({
      path: "id",
      message: "Must be a non-empty string"
    });
  }

  const ts = input.ts;
  if (!isIsoTimestamp(ts)) {
    errors.push({
      path: "ts",
      message: "Must be a valid ISO timestamp"
    });
  }

  const bubbleId = input.bubble_id;
  if (!isNonEmptyString(bubbleId)) {
    errors.push({
      path: "bubble_id",
      message: "Must be a non-empty string"
    });
  }

  const sender = input.sender;
  if (!isProtocolParticipant(sender)) {
    errors.push({
      path: "sender",
      message: "Must be one of: codex, claude, orchestrator, human"
    });
  }

  const recipient = input.recipient;
  if (!isProtocolParticipant(recipient)) {
    errors.push({
      path: "recipient",
      message: "Must be one of: codex, claude, orchestrator, human"
    });
  }

  const envelopeType = input.type;
  if (!isProtocolMessageType(envelopeType)) {
    errors.push({
      path: "type",
      message: `Must be one of: ${protocolMessageTypes.join(", ")}`
    });
  }

  const round = input.round;
  if (!isInteger(round) || round < 0) {
    errors.push({
      path: "round",
      message: "Must be a non-negative integer"
    });
  }

  const payload = input.payload;
  if (!isRecord(payload)) {
    errors.push({
      path: "payload",
      message: "Must be an object"
    });
  }

  const refs = input.refs;
  if (!(Array.isArray(refs) && refs.every((value) => isNonEmptyString(value)))) {
    errors.push({
      path: "refs",
      message: "Must be an array of non-empty strings"
    });
  }

  const validatedPayload =
    isProtocolMessageType(envelopeType) && isRecord(payload)
      ? validatePayloadByType(envelopeType, payload, errors)
      : undefined;

  if (errors.length > 0) {
    return validationFail(errors);
  }

  return validationOk({
    id: id as string,
    ts: ts as string,
    bubble_id: bubbleId as string,
    sender: sender as ProtocolEnvelope["sender"],
    recipient: recipient as ProtocolEnvelope["recipient"],
    type: envelopeType as ProtocolEnvelope["type"],
    round: round as number,
    payload: validatedPayload as ProtocolEnvelope["payload"],
    refs: refs as string[]
  } as ProtocolEnvelope);
}

export function assertValidProtocolEnvelope(input: unknown): ProtocolEnvelope {
  const result = validateProtocolEnvelope(input);
  return assertValidation(result, "Invalid protocol envelope");
}
