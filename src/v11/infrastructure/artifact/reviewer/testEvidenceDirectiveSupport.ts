import type {
  ReviewerTestEvidenceArtifact,
  ReviewerTestExecutionDirective,
  ReviewerTestReasonCode
} from "../../../shared/reviewer/testEvidence.js";
import type { WorktreeFingerprint } from "./testEvidenceVerificationHelpers.js";

export const docsOnlyRuntimeChecksNotRequiredDetail =
  "docs-only scope, runtime checks not required";

export function summarizeReason(
  reasonCode: ReviewerTestReasonCode,
  detail: string
): string {
  if (detail.trim().length > 0) {
    return detail;
  }

  switch (reasonCode) {
    case "evidence_missing":
      return "Latest implementer handoff did not include evidence for all required checks.";
    case "evidence_unverifiable":
      return "Latest implementer evidence could not be verified for command provenance, exit status, or completion markers.";
    case "evidence_stale":
      return "Verified evidence no longer matches current worktree fingerprint.";
    case "pass_validation_policy_missing":
      return "PASS validation policy is not configured in bubble [commands]; reviewer must run checks.";
    case "no_trigger":
      return "Evidence is verified, fresh, and complete.";
  }
}

export function createDocsOnlySkipDirective(
  detail: string = docsOnlyRuntimeChecksNotRequiredDetail
): ReviewerTestExecutionDirective {
  return {
    skip_full_rerun: true,
    reason_code: "no_trigger",
    reason_detail: summarizeReason("no_trigger", detail),
    verification_status: "trusted"
  };
}

export function compareFingerprint(
  artifact: ReviewerTestEvidenceArtifact,
  current: WorktreeFingerprint
): { stale: boolean; detail: string } {
  if (!current.ok) {
    return {
      stale: true,
      detail: "Cannot resolve current git fingerprint; evidence freshness cannot be confirmed."
    };
  }

  if (artifact.git.commit_sha !== current.commitSha) {
    return {
      stale: true,
      detail: `Commit changed after verification (${artifact.git.commit_sha ?? "unknown"} -> ${current.commitSha ?? "unknown"}).`
    };
  }

  if (artifact.git.status_hash !== current.statusHash) {
    return {
      stale: true,
      detail: "Worktree status changed after verification; prior evidence is stale."
    };
  }

  return {
    stale: false,
    detail: "Evidence fingerprint matches current worktree state."
  };
}

export function isDocsOnlyCompatibilityArtifact(
  artifact: ReviewerTestEvidenceArtifact
): boolean {
  const reasonDetail = artifact.reason_detail.trim();
  const hasDocsOnlyDiscriminator =
    /(?:docs-only|document-only)\s+scope/iu.test(reasonDetail);

  return (
    artifact.status === "trusted" &&
    artifact.decision === "skip_full_rerun" &&
    artifact.reason_code === "no_trigger" &&
    hasDocsOnlyDiscriminator &&
    artifact.required_commands.length === 0 &&
    artifact.command_evidence.length === 0 &&
    artifact.git.commit_sha === null &&
    artifact.git.status_hash === null &&
    artifact.git.dirty === null
  );
}
