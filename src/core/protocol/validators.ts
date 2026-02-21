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
} from "../validation.js";
import { isFindingSeverity, type Finding } from "../../types/findings.js";
import {
  isApprovalDecision,
  isPassIntent,
  isProtocolMessageType,
  isProtocolParticipant,
  type ProtocolEnvelope
} from "../../types/protocol.js";

const allowedPayloadKeys = new Set([
  "summary",
  "question",
  "message",
  "decision",
  "pass_intent",
  "findings",
  "metadata"
]);

function validateFindings(
  input: unknown,
  path: string,
  errors: ValidationError[]
): Finding[] | undefined {
  if (!Array.isArray(input)) {
    errors.push({
      path,
      message: "Must be an array"
    });
    return undefined;
  }

  const findings: Finding[] = [];
  input.forEach((entry, index) => {
    const findingPath = `${path}[${index}]`;
    if (!isRecord(entry)) {
      errors.push({
        path: findingPath,
        message: "Must be an object"
      });
      return;
    }

    const severity = entry.severity;
    if (!isFindingSeverity(severity)) {
      errors.push({
        path: `${findingPath}.severity`,
        message: "Must be one of: P0, P1, P2, P3"
      });
    }

    const title = entry.title;
    if (!isNonEmptyString(title)) {
      errors.push({
        path: `${findingPath}.title`,
        message: "Must be a non-empty string"
      });
    }

    const detail = entry.detail;
    if (!(detail === undefined || isNonEmptyString(detail))) {
      errors.push({
        path: `${findingPath}.detail`,
        message: "Must be a non-empty string when provided"
      });
    }

    const code = entry.code;
    if (!(code === undefined || isNonEmptyString(code))) {
      errors.push({
        path: `${findingPath}.code`,
        message: "Must be a non-empty string when provided"
      });
    }

    const refs = entry.refs;
    if (
      !(
        refs === undefined ||
        (Array.isArray(refs) && refs.every((value) => isNonEmptyString(value)))
      )
    ) {
      errors.push({
        path: `${findingPath}.refs`,
        message: "Must be an array of non-empty strings when provided"
      });
    }

    if (
      isFindingSeverity(severity) &&
      isNonEmptyString(title) &&
      (detail === undefined || isNonEmptyString(detail)) &&
      (code === undefined || isNonEmptyString(code)) &&
      (refs === undefined ||
        (Array.isArray(refs) && refs.every((value) => isNonEmptyString(value))))
    ) {
      const finding: Finding = {
        severity,
        title
      };

      if (isNonEmptyString(detail)) {
        finding.detail = detail;
      }
      if (isNonEmptyString(code)) {
        finding.code = code;
      }
      if (
        Array.isArray(refs) &&
        refs.every((value) => isNonEmptyString(value))
      ) {
        finding.refs = refs;
      }

      findings.push(finding);
    }
  });

  return findings;
}

function validatePayloadByType(
  envelopeType: string,
  payload: Record<string, unknown>,
  errors: ValidationError[]
): ProtocolEnvelope["payload"] {
  const unknownKeys = Object.keys(payload).filter(
    (key) => !allowedPayloadKeys.has(key)
  );
  for (const key of unknownKeys) {
    errors.push({
      path: `payload.${key}`,
      message: "Unknown payload field; use payload.metadata for custom data"
    });
  }

  if (payload.pass_intent !== undefined && !isPassIntent(payload.pass_intent)) {
    errors.push({
      path: "payload.pass_intent",
      message: "Must be one of: task, review, fix_request"
    });
  }

  if (payload.metadata !== undefined && !isRecord(payload.metadata)) {
    errors.push({
      path: "payload.metadata",
      message: "Must be an object when provided"
    });
  }

  const findings =
    payload.findings !== undefined
      ? validateFindings(payload.findings, "payload.findings", errors)
      : undefined;

  const validatedPayload: ProtocolEnvelope["payload"] = {};
  if (payload.summary !== undefined && isNonEmptyString(payload.summary)) {
    validatedPayload.summary = payload.summary;
  }
  if (payload.question !== undefined && isNonEmptyString(payload.question)) {
    validatedPayload.question = payload.question;
  }
  if (payload.message !== undefined && isNonEmptyString(payload.message)) {
    validatedPayload.message = payload.message;
  }
  if (isApprovalDecision(payload.decision)) {
    validatedPayload.decision = payload.decision;
  }
  if (isPassIntent(payload.pass_intent)) {
    validatedPayload.pass_intent = payload.pass_intent;
  }
  if (findings !== undefined) {
    validatedPayload.findings = findings;
  }
  if (isRecord(payload.metadata)) {
    validatedPayload.metadata = payload.metadata;
  }

  if (envelopeType === "PASS") {
    if (!isNonEmptyString(payload.summary)) {
      errors.push({
        path: "payload.summary",
        message: "PASS payload requires non-empty summary"
      });
    }
    return validatedPayload;
  }

  if (envelopeType === "HUMAN_QUESTION") {
    if (!isNonEmptyString(payload.question)) {
      errors.push({
        path: "payload.question",
        message: "HUMAN_QUESTION payload requires non-empty question"
      });
    }
    return validatedPayload;
  }

  if (envelopeType === "HUMAN_REPLY") {
    if (!isNonEmptyString(payload.message)) {
      errors.push({
        path: "payload.message",
        message: "HUMAN_REPLY payload requires non-empty message"
      });
    }
    return validatedPayload;
  }

  if (envelopeType === "CONVERGENCE") {
    if (!isNonEmptyString(payload.summary)) {
      errors.push({
        path: "payload.summary",
        message: "CONVERGENCE payload requires non-empty summary"
      });
    }
    return validatedPayload;
  }

  if (envelopeType === "APPROVAL_DECISION") {
    if (!isApprovalDecision(payload.decision)) {
      errors.push({
        path: "payload.decision",
        message: "APPROVAL_DECISION requires decision: approve|reject|revise"
      });
    }
  }

  return validatedPayload;
}

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
      message:
        "Must be one of: TASK, PASS, HUMAN_QUESTION, HUMAN_REPLY, CONVERGENCE, APPROVAL_REQUEST, APPROVAL_DECISION, DONE_PACKAGE"
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
  });
}

export function assertValidProtocolEnvelope(input: unknown): ProtocolEnvelope {
  const result = validateProtocolEnvelope(input);
  return assertValidation(result, "Invalid protocol envelope");
}
