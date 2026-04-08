import {
  type ProtocolEnvelope
} from "../../../types/protocol.js";
import { type ValidationError } from "../validation/primitives.js";
import { validateFindings } from "./protocolFindingValidation.js";
import {
  buildValidatedPayload,
  validateEnvelopeSpecificPayload,
  validateFindingsClaimFields,
  validatePayloadMetadata,
  validateUnknownPayloadKeys
} from "./protocolPayloadValidationHelpers.js";

export function validatePayloadByType(
  envelopeType: string,
  payload: Record<string, unknown>,
  errors: ValidationError[]
): ProtocolEnvelope["payload"] {
  validateUnknownPayloadKeys(payload, errors);
  validateFindingsClaimFields(payload, errors);
  validatePayloadMetadata(payload, errors);

  const findings =
    payload.findings !== undefined
      ? validateFindings(payload.findings, "payload.findings", errors)
      : undefined;

  return validateEnvelopeSpecificPayload(
    envelopeType,
    payload,
    buildValidatedPayload({ payload, findings }),
    errors
  );
}
