import type { AgentName } from "../../../types/bubble.js";
import type {
  RunConvergedFlowDependencies,
  RunConvergedFlowResult
} from "../../application/converged/runConvergedFlow.js";

export const convergedStructuredFindingSeverities = ["P2", "P3"] as const;
export type ConvergedStructuredFindingSeverity =
  (typeof convergedStructuredFindingSeverities)[number];

export interface ConvergedStructuredFinding {
  severity: ConvergedStructuredFindingSeverity;
  title: string;
  refs?: string[];
}

export function isConvergedStructuredFindingSeverity(
  value: unknown
): value is ConvergedStructuredFindingSeverity {
  return (
    typeof value === "string"
    && (convergedStructuredFindingSeverities as readonly string[]).includes(value)
  );
}

export interface EmitConvergedInput {
  summary: string;
  refs?: string[];
  findings?: ConvergedStructuredFinding[];
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
