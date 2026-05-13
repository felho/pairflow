import { normalizeReviewerFindingsPayload } from "../../../../domain/pass/reviewerFindingsPayload.js";
import type { Finding } from "../../../../../contracts/kernel/findings.js";

export interface NormalizePassCommandPayloadInput {
  findings: unknown;
  noFindings?: boolean | undefined;
}

export interface NormalizedPassCommandPayload {
  findings: Finding[];
  hasFindings: boolean;
  noFindings: boolean;
  findingsPayloadInvalid: boolean;
}

export function normalizePassCommandPayload(
  input: NormalizePassCommandPayloadInput
): NormalizedPassCommandPayload {
  const normalizedFindings = normalizeReviewerFindingsPayload(input.findings);
  const findings = normalizedFindings.findings;
  return {
    findings,
    hasFindings: findings.length > 0,
    noFindings: input.noFindings ?? false,
    findingsPayloadInvalid: normalizedFindings.invalid
  };
}
