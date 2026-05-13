import type {
  AgentRole
} from "../../../contracts/kernel/agentIdentity.js";
import type {
  PassIntent
} from "../../../contracts/kernel/protocol.js";
import type {
  MetaReviewRecommendation
} from "../../shared/metaReview/metaReviewTypes.js";
import type { Finding } from "../../../types/findings.js";

// New ActorOutputKind values are successor-owned, not local widenings.
// If a future change needs a new output kind, activate the deferred `O3-T5`
// slice from:
// - plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md
// - docs/actor-runtime-interface/onboarding-extension-surface-contract-note-v1.md
export const actorOutputKinds = [
  "pass",
  "human_question",
  "convergence",
  "meta_review_result"
] as const;

export type ActorOutputKind = (typeof actorOutputKinds)[number];

export interface ActorEmitBaseInput {
  kind: ActorOutputKind;
  repo: string;
  bubble_id: string;
  handoff_id: string;
  execution_id: string;
  refs?: string[];
  expected_role?: AgentRole;
  expected_round?: number;
  expected_state_fingerprint?: string;
}

export interface PassActorEmitInput extends ActorEmitBaseInput {
  kind: "pass";
  summary: string;
  intent?: PassIntent;
  findings?: Finding[];
  no_findings?: boolean;
}

export interface HumanQuestionActorEmitInput extends ActorEmitBaseInput {
  kind: "human_question";
  question: string;
}

export interface ConvergenceActorEmitInput extends ActorEmitBaseInput {
  kind: "convergence";
  summary: string;
  findings?: Array<{
    severity: "P2" | "P3";
    title: string;
    refs?: string[];
  }>;
}

export interface MetaReviewResultActorEmitInput extends ActorEmitBaseInput {
  kind: "meta_review_result";
  round: number;
  recommendation: MetaReviewRecommendation;
  summary: string;
  rework_target_message?: string | null;
  report_json: Record<string, unknown>;
}

export type ActorEmitInput =
  | PassActorEmitInput
  | HumanQuestionActorEmitInput
  | ConvergenceActorEmitInput
  | MetaReviewResultActorEmitInput;

export function isActorOutputKind(value: unknown): value is ActorOutputKind {
  return (
    typeof value === "string"
    && (actorOutputKinds as readonly string[]).includes(value)
  );
}
