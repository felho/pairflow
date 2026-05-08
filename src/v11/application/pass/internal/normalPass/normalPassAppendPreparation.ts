import { join } from "node:path";

import {
  evaluateReviewerGateWarnings,
  isDocContractGateScopeActive
} from "../../../../shared/gates/docContractGates.js";
import type { ReviewArtifactType } from "../../../../shared/config/bubbleConfigVocabulary.js";
import type { Finding } from "../../../../../types/findings.js";

export interface PrepareNormalPassAppendInput {
  senderRole: "implementer" | "reviewer";
  reviewArtifactType: ReviewArtifactType;
  round: number;
  findings: Finding[];
  hasFindings: boolean;
  roundGateAppliesAfter: number;
  locksDir: string;
  bubbleId: string;
}

export interface PrepareNormalPassAppendDependencies {
  evaluateReviewerGateWarnings?: typeof evaluateReviewerGateWarnings;
  isDocContractGateScopeActive?: typeof isDocContractGateScopeActive;
}

export interface PrepareNormalPassAppendResult {
  docGateScopeActive: boolean;
  reviewerGateEvaluation?: ReturnType<typeof evaluateReviewerGateWarnings>;
  findingsForPayload: Finding[];
  lockPath: string;
}

export function prepareNormalPassAppend(
  input: PrepareNormalPassAppendInput,
  dependencies: PrepareNormalPassAppendDependencies = {}
): PrepareNormalPassAppendResult {
  const evaluateReviewerGate =
    dependencies.evaluateReviewerGateWarnings
    ?? evaluateReviewerGateWarnings;
  const isDocGateScopeActive =
    dependencies.isDocContractGateScopeActive
    ?? isDocContractGateScopeActive;

  const docGateScopeActive =
    input.senderRole === "reviewer"
    && isDocGateScopeActive({
      reviewArtifactType: input.reviewArtifactType
    });

  let reviewerGateEvaluation:
    | ReturnType<typeof evaluateReviewerGateWarnings>
    | undefined;
  const findingsForPayload: Finding[] =
    docGateScopeActive && input.hasFindings
      ? (() => {
        reviewerGateEvaluation = evaluateReviewerGate({
          round: input.round,
          findings: input.findings,
          roundGateAppliesAfter: input.roundGateAppliesAfter
        });
        return reviewerGateEvaluation.normalizedFindings;
      })()
      : input.findings;

  const lockPath = join(input.locksDir, `${input.bubbleId}.lock`);
  return {
    docGateScopeActive,
    ...(reviewerGateEvaluation !== undefined
      ? { reviewerGateEvaluation }
      : {}),
    findingsForPayload,
    lockPath
  };
}
