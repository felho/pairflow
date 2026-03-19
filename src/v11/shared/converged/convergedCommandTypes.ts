import type { AgentName } from "../../../types/bubble.js";
import type {
  RunConvergedFlowDependencies,
  RunConvergedFlowResult
} from "../../application/converged/runConvergedFlow.js";

export interface EmitConvergedInput {
  summary: string;
  refs?: string[];
  cwd?: string;
  now?: Date;
  expectedStateFingerprint?: string;
  expectedRound?: number;
  expectedReviewer?: AgentName;
}

export type EmitConvergedDependencies = Pick<
  RunConvergedFlowDependencies,
  | "emitTmuxDeliveryNotification"
  | "emitBubbleNotification"
  | "applyMetaReviewGateOnConvergence"
  | "recoverMetaReviewGateFromSnapshot"
>;

export type EmitConvergedResult = RunConvergedFlowResult;
