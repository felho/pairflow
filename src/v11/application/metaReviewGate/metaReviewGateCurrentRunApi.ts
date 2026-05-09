import type { MetaReviewGateResult } from "../../shared/metaReviewGate/metaReviewGateResultContract.js";
import {
  runCurrentRunMetaReviewGateFinalization
} from "./internal/currentRun/finalizationPipeline.js";
import type { FinalizeCurrentRunMetaReviewGateInput } from "../../shared/metaReviewGate/metaReviewGateCurrentRunTypes.js";

export type {
  MetaReviewApproveValidationCommandRunInput
} from "../../shared/metaReviewGate/metaReviewGateCurrentRunTypes.js";

export type {
  FinalizeCurrentRunMetaReviewGateInput
} from "../../shared/metaReviewGate/metaReviewGateCurrentRunTypes.js";

export async function finalizeCurrentRunMetaReviewGate(
  input: FinalizeCurrentRunMetaReviewGateInput
): Promise<MetaReviewGateResult> {
  return runCurrentRunMetaReviewGateFinalization(input);
}
