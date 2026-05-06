import type { Finding } from "../../../types/findings.js";
import type { FindingsParityMetadata } from "../../../types/protocol.js";
import {
  resolveLegacySummaryFindingsClaimState
} from "../convergence/policy.js";
import {
  buildFindingsParityMetadata
} from "./findingsParityMetadata.js";
import {
  projectDisplayableFindingsFromArtifact
} from "./findingsProjection.js";

export interface VerifiedReworkFindingsParityInput {
  summary?: string | undefined;
  findings: unknown;
  findingsCount: number;
  artifactOpenTotal: number;
  artifactStatus: string;
  digest: string;
  metaReviewRunId: string;
}

export interface VerifiedReworkFindingsParityValidation {
  ok: true;
  diagnostics: string[];
  metadata: FindingsParityMetadata;
  findingsForPayload?: Finding[];
}

export function buildVerifiedReworkFindingsParityValidation(
  input: VerifiedReworkFindingsParityInput
): VerifiedReworkFindingsParityValidation {
  const parserState = resolveLegacySummaryFindingsClaimState(input.summary);
  const diagnostics = parserState === "open_findings"
    ? []
    : [
        `CLAIM_PARSER_DIVERGENCE_DIAGNOSTIC: parser_state=${parserState} structured_state=open_findings structured_source=meta_review_artifact`
      ];
  const findingsForPayload = projectDisplayableFindingsFromArtifact(
    input.findings
  );

  return {
    ok: true,
    diagnostics,
    ...(findingsForPayload !== undefined ? { findingsForPayload } : {}),
    metadata: buildFindingsParityMetadata({
      findingsCount: input.findingsCount,
      artifactOpenTotal: input.artifactOpenTotal,
      artifactStatus: input.artifactStatus,
      digest: input.digest,
      metaReviewRunId: input.metaReviewRunId,
      parityStatus: "ok"
    })
  };
}
