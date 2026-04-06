import type { PairflowCommandPathAssessment } from "../../infrastructure/executor/command/pairflowCommand.js";
import {
  resolveMetaReviewRolloutBlockingReasonCodesV11
} from "../../application/converged/metaReviewRolloutBlockingReasonCodes.js";
import { type MetaReviewGateRoute } from "../metaReviewGate/metaReviewGateCommandContract.js";

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
