export const workModes = ["worktree", "clone"] as const;

export type WorkMode = (typeof workModes)[number];

export const qualityModes = ["strict"] as const;

export type QualityMode = (typeof qualityModes)[number];

export const reviewerContextModes = ["fresh", "persistent"] as const;

export type ReviewerContextMode = (typeof reviewerContextModes)[number];

export const pairflowCommandProfiles = ["external", "self_host"] as const;

export type PairflowCommandProfile = (typeof pairflowCommandProfiles)[number];

export const roleMcpPolicyValues = ["disabled", "enabled"] as const;

export type RoleMcpPolicy = (typeof roleMcpPolicyValues)[number];

export const reviewArtifactTypes = ["code", "document"] as const;

export type ReviewArtifactType = (typeof reviewArtifactTypes)[number];

export const createReviewArtifactTypes = ["code", "document"] as const;

export type CreateReviewArtifactType =
  (typeof createReviewArtifactTypes)[number];

export function isWorkMode(value: unknown): value is WorkMode {
  return (
    typeof value === "string" && (workModes as readonly string[]).includes(value)
  );
}

export function isQualityMode(value: unknown): value is QualityMode {
  return (
    typeof value === "string" && (qualityModes as readonly string[]).includes(value)
  );
}

export function isReviewerContextMode(
  value: unknown
): value is ReviewerContextMode {
  return (
    typeof value === "string" &&
    (reviewerContextModes as readonly string[]).includes(value)
  );
}

export function isReviewArtifactType(
  value: unknown
): value is ReviewArtifactType {
  return (
    typeof value === "string" &&
    (reviewArtifactTypes as readonly string[]).includes(value)
  );
}

export function isPairflowCommandProfile(
  value: unknown
): value is PairflowCommandProfile {
  return (
    typeof value === "string" &&
    (pairflowCommandProfiles as readonly string[]).includes(value)
  );
}

export function isRoleMcpPolicy(value: unknown): value is RoleMcpPolicy {
  return (
    typeof value === "string" &&
    (roleMcpPolicyValues as readonly string[]).includes(value)
  );
}

export function isCreateReviewArtifactType(
  value: unknown
): value is CreateReviewArtifactType {
  return (
    typeof value === "string" &&
    (createReviewArtifactTypes as readonly string[]).includes(value)
  );
}
