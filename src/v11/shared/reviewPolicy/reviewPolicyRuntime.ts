import {
  DEFAULT_REVIEW_POLICY_AUTO_REWORK_MIN_SEVERITY,
  DEFAULT_REVIEW_POLICY_CONSECUTIVE_CLEAN_RUNS_REQUIRED,
  DEFAULT_REVIEW_POLICY_REVIEWER_BLOCKING_MIN_SEVERITY,
  DEFAULT_REVIEW_POLICY_LOOP_MODE
} from "../../../config/defaults.js";
import type {
  AgentRole,
  BubbleConfig,
  BubbleExecutionContext,
  BubbleReviewPolicyConfig,
  BubbleReviewPolicyRuntimeView
} from "../../../types/bubble.js";
import { isAgentRole } from "../../../types/bubble.js";

export const REVIEW_POLICY_META_ONLY_GUARDED =
  "REVIEW_POLICY_META_ONLY_GUARDED" as const;
export const REVIEW_POLICY_META_ONLY_PHASE3B_PENDING =
  "reviewer_bypass_activation_phase3b_pending" as const;
export const REVIEW_POLICY_META_ONLY_PROVENANCE_NOTE =
  (
    "Requested meta-only review remains guarded in Phase 3A; runtime execution stays on the full review loop until Phase 3B activation closes scheduler/router handoff ownership."
  ) as const;
export const REVIEW_POLICY_META_ONLY_ACTIVATION_UNRESOLVED =
  "REVIEW_POLICY_META_ONLY_ACTIVATION_UNRESOLVED" as const;
export const REVIEW_POLICY_META_ONLY_ACTIVATION_REQUIRED =
  "reviewer_bypass_activation_provenance_required" as const;
export const REVIEW_POLICY_META_ONLY_ACTIVATION_UNRESOLVED_PROVENANCE_NOTE =
  (
    "Requested meta-only review remains fail-closed on the full review loop until canonical implementer pass authority proves reviewer-bypass activation for the live pass path."
  ) as const;

export type NormalizedBubbleReviewPolicy =
  BubbleReviewPolicyConfig & {
    meta_review_consecutive_clean_runs_required: number;
  };

export interface RuntimeAlignedReviewPolicyExecutionContext {
  activeRole: "implementer" | "reviewer" | "meta_reviewer";
  round: number;
  handoffId: string;
  executionId: string;
}

export interface BuildRuntimeAlignedReviewPolicyRuntimeViewInput {
  config: Pick<BubbleConfig, "review_policy">;
  round: number;
  activeRole: "implementer" | "reviewer" | "meta_reviewer" | null;
  executionContext?: RuntimeAlignedReviewPolicyExecutionContext | null;
  runtimeAvailability?: "active" | "inactive" | "missing";
  runtimeStateInvalid?: boolean;
}

export function normalizeRuntimeAlignedRole(
  value: string | null
): AgentRole | null {
  return isAgentRole(value) ? value : null;
}

export function normalizeRuntimeAlignedExecutionContext(
  executionContext:
    | {
      activeRole: string;
      round: number;
      handoffId: string;
      executionId: string;
    }
    | null
    | undefined
): RuntimeAlignedReviewPolicyExecutionContext | null {
  if (executionContext === null || executionContext === undefined) {
    return null;
  }

  const activeRole = normalizeRuntimeAlignedRole(executionContext.activeRole);
  if (activeRole === null) {
    return null;
  }

  return {
    activeRole,
    round: executionContext.round,
    handoffId: executionContext.handoffId,
    executionId: executionContext.executionId
  };
}

export function toRuntimeAlignedReviewPolicyExecutionContext(
  executionContext: BubbleExecutionContext | null | undefined
): RuntimeAlignedReviewPolicyExecutionContext | null {
  if (executionContext === null || executionContext === undefined) {
    return null;
  }

  return {
    activeRole: executionContext.active_role,
    round: executionContext.round,
    handoffId: executionContext.handoff_id,
    executionId: executionContext.execution_id
  };
}

export function normalizeBubbleReviewPolicy(
  config: Pick<BubbleConfig, "review_policy">
): NormalizedBubbleReviewPolicy {
  return {
    review_loop_mode:
      config.review_policy?.review_loop_mode ?? DEFAULT_REVIEW_POLICY_LOOP_MODE,
    reviewer_blocking_min_severity:
      config.review_policy?.reviewer_blocking_min_severity
      ?? DEFAULT_REVIEW_POLICY_REVIEWER_BLOCKING_MIN_SEVERITY,
    meta_review_auto_rework_min_severity:
      config.review_policy?.meta_review_auto_rework_min_severity
      ?? DEFAULT_REVIEW_POLICY_AUTO_REWORK_MIN_SEVERITY,
    meta_review_consecutive_clean_runs_required:
      config.review_policy?.meta_review_consecutive_clean_runs_required
      ?? DEFAULT_REVIEW_POLICY_CONSECUTIVE_CLEAN_RUNS_REQUIRED
  };
}

export function buildBubbleReviewPolicyRuntimeView(
  config: Pick<BubbleConfig, "review_policy">
): BubbleReviewPolicyRuntimeView {
  const normalized = normalizeBubbleReviewPolicy(config);
  if (normalized.review_loop_mode === "meta_only") {
    return {
      requested_loop_mode: normalized.review_loop_mode,
      effective_loop_mode: "full",
      support_status: "guarded",
      reviewer_blocking_min_severity:
        normalized.reviewer_blocking_min_severity,
      meta_review_auto_rework_min_severity:
        normalized.meta_review_auto_rework_min_severity,
      meta_review_consecutive_clean_runs_required:
        normalized.meta_review_consecutive_clean_runs_required,
      blocked_reason_code: REVIEW_POLICY_META_ONLY_GUARDED,
      blocked_prerequisites: [REVIEW_POLICY_META_ONLY_PHASE3B_PENDING],
      provenance_note: REVIEW_POLICY_META_ONLY_PROVENANCE_NOTE
    };
  }

  return {
    requested_loop_mode: normalized.review_loop_mode,
    effective_loop_mode: normalized.review_loop_mode,
    support_status: "enabled",
    reviewer_blocking_min_severity: normalized.reviewer_blocking_min_severity,
    meta_review_auto_rework_min_severity:
      normalized.meta_review_auto_rework_min_severity,
    meta_review_consecutive_clean_runs_required:
      normalized.meta_review_consecutive_clean_runs_required
  };
}

export function buildPassPathReviewPolicyRuntimeView(input: {
  config: Pick<BubbleConfig, "review_policy">;
  activationProven: boolean;
}): BubbleReviewPolicyRuntimeView {
  const normalized = normalizeBubbleReviewPolicy(input.config);
  if (normalized.review_loop_mode !== "meta_only") {
    return {
      requested_loop_mode: normalized.review_loop_mode,
      effective_loop_mode: normalized.review_loop_mode,
      support_status: "enabled",
      reviewer_blocking_min_severity:
        normalized.reviewer_blocking_min_severity,
      meta_review_auto_rework_min_severity:
        normalized.meta_review_auto_rework_min_severity,
      meta_review_consecutive_clean_runs_required:
        normalized.meta_review_consecutive_clean_runs_required
    };
  }

  if (input.activationProven) {
    return {
      requested_loop_mode: normalized.review_loop_mode,
      effective_loop_mode: normalized.review_loop_mode,
      support_status: "enabled",
      reviewer_blocking_min_severity:
        normalized.reviewer_blocking_min_severity,
      meta_review_auto_rework_min_severity:
        normalized.meta_review_auto_rework_min_severity,
      meta_review_consecutive_clean_runs_required:
        normalized.meta_review_consecutive_clean_runs_required
    };
  }

  return {
    requested_loop_mode: normalized.review_loop_mode,
    effective_loop_mode: "full",
    support_status: "guarded",
    reviewer_blocking_min_severity: normalized.reviewer_blocking_min_severity,
    meta_review_auto_rework_min_severity:
      normalized.meta_review_auto_rework_min_severity,
    meta_review_consecutive_clean_runs_required:
      normalized.meta_review_consecutive_clean_runs_required,
    blocked_reason_code: REVIEW_POLICY_META_ONLY_ACTIVATION_UNRESOLVED,
    blocked_prerequisites: [REVIEW_POLICY_META_ONLY_ACTIVATION_REQUIRED],
    provenance_note:
      REVIEW_POLICY_META_ONLY_ACTIVATION_UNRESOLVED_PROVENANCE_NOTE
  };
}

function isRuntimeAlignedMetaOnlyActivationProven(
  input: BuildRuntimeAlignedReviewPolicyRuntimeViewInput
): boolean {
  const normalized = normalizeBubbleReviewPolicy(input.config);
  if (normalized.review_loop_mode !== "meta_only") {
    return false;
  }
  if (input.runtimeStateInvalid === true) {
    return false;
  }
  if (
    input.runtimeAvailability !== undefined
    && input.runtimeAvailability !== "active"
  ) {
    return false;
  }
  if (input.activeRole !== "implementer") {
    return false;
  }

  const executionContext = input.executionContext;
  if (executionContext === null || executionContext === undefined) {
    return false;
  }
  if (
    executionContext.activeRole !== "implementer"
    || executionContext.round !== input.round
  ) {
    return false;
  }
  if (executionContext.handoffId === executionContext.executionId) {
    return false;
  }
  return executionContext.executionId.trim().length > 0;
}

export function buildRuntimeAlignedReviewPolicyRuntimeView(
  input: BuildRuntimeAlignedReviewPolicyRuntimeViewInput
): BubbleReviewPolicyRuntimeView {
  return buildPassPathReviewPolicyRuntimeView({
    config: input.config,
    activationProven: isRuntimeAlignedMetaOnlyActivationProven(input)
  });
}

export function resolveRuntimeAlignedConvergedActiveRole(
  input: BuildRuntimeAlignedReviewPolicyRuntimeViewInput
): "implementer" | "reviewer" {
  return buildRuntimeAlignedReviewPolicyRuntimeView(input)
    .effective_loop_mode === "meta_only"
    ? "implementer"
    : "reviewer";
}
