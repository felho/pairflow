import { DEFAULT_DOC_CONTRACT_ROUND_GATE_APPLIES_AFTER } from "../defaults.js";
import type { BubbleConfig } from "../../types/bubble.js";
import { isInteger } from "../../v11/shared/validation/primitives.js";
import type { ValidationError } from "../../v11/shared/validation/primitives.js";
import { describeUnknownValue, readString } from "./readers.js";

export function validateBubbleDocContractGates(
  docContractGates: Record<string, unknown> | undefined,
  errors: ValidationError[]
): NonNullable<BubbleConfig["doc_contract_gates"]> {
  const warnings: string[] = [];
  const existingParseWarning = docContractGates
    ? readString(
        docContractGates,
        "parse_warning",
        "doc_contract_gates.parse_warning",
        errors,
        false
      )
    : undefined;
  const roundGateAppliesAfterCandidate =
    docContractGates?.round_gate_applies_after;
  let roundGateAppliesAfter = DEFAULT_DOC_CONTRACT_ROUND_GATE_APPLIES_AFTER;
  if (roundGateAppliesAfterCandidate !== undefined) {
    if (isInteger(roundGateAppliesAfterCandidate) && roundGateAppliesAfterCandidate >= 0) {
      roundGateAppliesAfter = roundGateAppliesAfterCandidate;
    } else {
      warnings.push(
        `doc_contract_gates.round_gate_applies_after must be a non-negative integer. Received ${describeUnknownValue(roundGateAppliesAfterCandidate)}.`
      );
    }
  }

  return {
    round_gate_applies_after: roundGateAppliesAfter,
    ...((existingParseWarning !== undefined || warnings.length > 0)
      ? {
          parse_warning: [
            existingParseWarning,
            ...(warnings.length > 0
              ? [warnings.join(" ")]
              : [])
          ]
            .filter((entry): entry is string => entry !== undefined)
            .join(" ")
        }
      : {})
  };
}
