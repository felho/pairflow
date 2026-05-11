import type { AgentRole } from "../../../../contracts/kernel/agentIdentity.js";

export const bubbleExecutionContextAwaitedOutputTypes = [
  "pass_result",
  "meta_review_result"
] as const;

export type BubbleExecutionContextAwaitedOutputType =
  (typeof bubbleExecutionContextAwaitedOutputTypes)[number];

export const metaReviewExecutionContextAwaitedOutputTypes = [
  "meta_review_result"
] as const;

export type MetaReviewExecutionContextAwaitedOutputType =
  (typeof metaReviewExecutionContextAwaitedOutputTypes)[number];

export interface BubbleMetaReviewExecutionContext {
  handoff_id: string;
  execution_id: string;
  round: number;
  awaited_output_type: MetaReviewExecutionContextAwaitedOutputType;
  started_at: string;
  deadline_at: string;
  attempt: number;
}

export interface BubbleExecutionContext {
  active_role: AgentRole;
  awaited_output_type: BubbleExecutionContextAwaitedOutputType;
  handoff_id: string;
  execution_id: string;
  round: number;
  started_at: string;
  deadline_at: string;
  attempt: number;
}

export function isMetaReviewExecutionContextAwaitedOutputType(
  value: unknown
): value is MetaReviewExecutionContextAwaitedOutputType {
  return (
    typeof value === "string" &&
    (
      metaReviewExecutionContextAwaitedOutputTypes as readonly string[]
    ).includes(value)
  );
}

export function isBubbleExecutionContextAwaitedOutputType(
  value: unknown
): value is BubbleExecutionContextAwaitedOutputType {
  return (
    typeof value === "string"
    && (
      bubbleExecutionContextAwaitedOutputTypes as readonly string[]
    ).includes(value)
  );
}
