import type {
  BubbleConfig
} from "../../../types/bubble.js";
import type {
  BubbleFailingGate,
  BubbleRoundGateState,
  BubbleSpecLockState
} from "./gateStateTypes.js";
import {
  docContractGateArtifactSchemaVersion,
  type DocContractGateArtifact
} from "./docContractGateArtifactContract.js";
import { normalizeDocContractGateArtifact as normalizeDocContractGateArtifactRecord } from "./docContractGateArtifactNormalization.js";
import {
  createDocContractConfigWarnings,
  evaluateTaskContractWarnings
} from "./docContractTaskWarnings.js";
import {
  type EvaluateReviewerGateResult
} from "./docContractReviewerWarnings.js";

export {
  DocContractGateArtifactError,
  docContractGateArtifactSchemaVersion
} from "./docContractGateArtifactContract.js";
export type { DocContractGateArtifact } from "./docContractGateArtifactContract.js";
export { evaluateTaskContractWarnings } from "./docContractTaskWarnings.js";
export { evaluateReviewerGateWarnings } from "./docContractReviewerWarnings.js";
export type { EvaluateReviewerGateInput, EvaluateReviewerGateResult } from "./docContractReviewerWarnings.js";

export function isDocContractGateScopeActive(input: {
  reviewArtifactType: BubbleConfig["review_artifact_type"];
}): boolean {
  return input.reviewArtifactType === "document";
}

function defaultSpecLockState(): BubbleSpecLockState {
  return {
    state: "IMPLEMENTABLE",
    open_blocker_count: 0,
    open_required_now_count: 0
  };
}

function defaultRoundGateState(round: number): BubbleRoundGateState {
  return {
    applies: false,
    violated: false,
    round
  };
}

export function createDocContractGateArtifact(input: {
  now: Date;
  bubbleConfig: BubbleConfig;
  taskContent: string;
}): DocContractGateArtifact {
  return {
    schema_version: docContractGateArtifactSchemaVersion,
    updated_at: input.now.toISOString(),
    task_warnings: evaluateTaskContractWarnings(input.taskContent),
    config_warnings: createDocContractConfigWarnings({
      parseWarning: input.bubbleConfig.doc_contract_gates.parse_warning
    }),
    review_warnings: [],
    finding_evaluations: [],
    round_gate_state: defaultRoundGateState(1),
    spec_lock_state: defaultSpecLockState()
  };
}
export function normalizeDocContractGateArtifact(raw: unknown): DocContractGateArtifact {
  return normalizeDocContractGateArtifactRecord(raw);
}

export function mergeArtifactWithReviewerEvaluation(input: {
  now: Date;
  artifact: DocContractGateArtifact;
  reviewerEvaluation: EvaluateReviewerGateResult;
}): DocContractGateArtifact {
  return {
    ...input.artifact,
    updated_at: input.now.toISOString(),
    review_warnings: input.reviewerEvaluation.warnings,
    finding_evaluations: input.reviewerEvaluation.findingEvaluations,
    round_gate_state: input.reviewerEvaluation.roundGateState,
    spec_lock_state: input.reviewerEvaluation.specLockState
  };
}

export function collectFailingGatesFromArtifact(
  artifact: DocContractGateArtifact
): BubbleFailingGate[] {
  return [
    ...artifact.task_warnings,
    ...artifact.config_warnings,
    ...artifact.review_warnings
  ];
}
