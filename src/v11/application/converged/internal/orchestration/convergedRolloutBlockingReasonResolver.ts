import type { PairflowCommandPathAssessment } from "../../../../ports/pairflowCommand.js";
import {
  resolveConvergedRolloutBlockingReasonCodes as resolveMetaReviewRolloutBlockingReasonCodes
} from "./metaReviewRolloutBlockingReasonCodes.js";
import { type MetaReviewGateRoute } from "../../../../shared/metaReviewGate/index.js";

export interface ResolveConvergedRolloutBlockingReasonCodesInput {
  gateRoute: MetaReviewGateRoute;
  commandPathStatus: PairflowCommandPathAssessment;
}

export function resolveConvergedRolloutBlockingReasonCodes(
  input: ResolveConvergedRolloutBlockingReasonCodesInput
): string[] {
  return resolveMetaReviewRolloutBlockingReasonCodes(input);
}
