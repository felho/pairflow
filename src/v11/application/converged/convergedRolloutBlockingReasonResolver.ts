import type { PairflowCommandPathAssessment } from "../../shared/ports/pairflowCommand.js";
import {
  resolveMetaReviewRolloutBlockingReasonCodesV11
} from "./metaReviewRolloutBlockingReasonCodes.js";
import { type MetaReviewGateRoute } from "../../shared/metaReviewGate/metaReviewGateCommandContract.js";

export interface ResolveConvergedRolloutBlockingReasonCodesInput {
  gateRoute: MetaReviewGateRoute;
  commandPathStatus: PairflowCommandPathAssessment;
}

export function resolveConvergedRolloutBlockingReasonCodes(
  input: ResolveConvergedRolloutBlockingReasonCodesInput
): string[] {
  return resolveMetaReviewRolloutBlockingReasonCodesV11(input);
}
