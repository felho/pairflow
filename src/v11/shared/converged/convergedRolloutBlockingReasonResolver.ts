import { type MetaReviewGateRoute } from "../../../core/bubble/metaReviewGate.js";
import type { PairflowCommandPathAssessment } from "../../../core/runtime/pairflowCommand.js";
import {
  resolveMetaReviewRolloutBlockingReasonCodesV11
} from "../../application/converged/metaReviewRolloutBlockingReasonCodes.js";

export interface ResolveConvergedRolloutBlockingReasonCodesInput {
  gateRoute: MetaReviewGateRoute;
  metaReviewWarnings: Array<{ reason_code: string }>;
  commandPathStatus: PairflowCommandPathAssessment;
}

export function resolveConvergedRolloutBlockingReasonCodes(
  input: ResolveConvergedRolloutBlockingReasonCodesInput
): string[] {
  return resolveMetaReviewRolloutBlockingReasonCodesV11(input);
}
