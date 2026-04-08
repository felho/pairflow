import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { reviewerTestEvidenceSchemaVersion } from "../../../shared/reviewer/testEvidence.js";
import type {
  ReviewerTestCommandEvidence,
  ReviewerTestDecision,
  ReviewerTestEvidenceArtifact,
  ReviewerTestEvidenceStatus,
  ReviewerTestExecutionDirective,
  ReviewerTestReasonCode,
  ResolveReviewerTestExecutionDirectiveInput,
  VerifyImplementerTestEvidenceInput
} from "../../../shared/reviewer/testEvidence.js";
import type {
  ResolveReviewerTestExecutionDirectiveFromArtifactInput
} from "../../../shared/ports/reviewerTestEvidenceArtifacts.js";
import {
  appendSourcePolicyDiagnostics,
  buildEvidenceDiagnostics,
  loadEvidenceSources
} from "./testEvidenceSourcePolicy.js";
import type { EvidenceSourcePolicyDecision } from "./testEvidenceSourcePolicy.js";
import {
  buildCommandEvidence,
  hasTrustedCommandEvidenceProvenance,
  normalizeCommandEvidenceProvenance,
  normalizeRequiredCommands,
  readWorktreeFingerprint
} from "./testEvidenceVerificationHelpers.js";
import type { WorktreeFingerprint } from "./testEvidenceVerificationHelpers.js";

const docsOnlyRuntimeChecksNotRequiredDetail = "docs-only scope, runtime checks not required";

function summarizeReason(reasonCode: ReviewerTestReasonCode, detail: string): string {
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

function createDocsOnlySkipDirective(
  detail: string = docsOnlyRuntimeChecksNotRequiredDetail
): ReviewerTestExecutionDirective {
  return {
    skip_full_rerun: true,
    reason_code: "no_trigger",
    reason_detail: summarizeReason("no_trigger", detail),
    verification_status: "trusted"
  };
}

function classifyEvidence(input: {
  commandEvidence: ReviewerTestCommandEvidence[];
  requiredCommands: string[];
  fingerprintOk: boolean;
  refsCount: number;
  sourcePolicyDecision: EvidenceSourcePolicyDecision;
}): {
  status: ReviewerTestEvidenceStatus;
  decision: ReviewerTestDecision;
  reasonCode: ReviewerTestReasonCode;
  reasonDetail: string;
} {
  if (input.requiredCommands.length === 0) {
    return {
      status: "untrusted",
      decision: "run_checks",
      reasonCode: "evidence_missing",
      reasonDetail: appendSourcePolicyDiagnostics({
        baseDetail: "Bubble config does not define required test/typecheck commands.",
        refsCount: input.refsCount,
        decision: input.sourcePolicyDecision
      })
    };
  }

  if (!input.fingerprintOk) {
    return {
      status: "untrusted",
      decision: "run_checks",
      reasonCode: "evidence_unverifiable",
      reasonDetail: appendSourcePolicyDiagnostics({
        baseDetail: "Could not bind evidence to a worktree fingerprint.",
        refsCount: input.refsCount,
        decision: input.sourcePolicyDecision
      })
    };
  }

  const missingCommands = input.commandEvidence
    .filter((entry) => entry.status === "missing")
    .map((entry) => entry.command);
  if (missingCommands.length > 0) {
    return {
      status: "untrusted",
      decision: "run_checks",
      reasonCode: "evidence_missing",
      reasonDetail: appendSourcePolicyDiagnostics({
        baseDetail: `Missing command evidence: ${missingCommands.join(", ")}.`,
        refsCount: input.refsCount,
        decision: input.sourcePolicyDecision
      })
    };
  }

  const badCommands = input.commandEvidence.filter(
    (entry) => entry.status === "failed" || entry.status === "unverifiable"
  );
  if (badCommands.length > 0) {
    return {
      status: "untrusted",
      decision: "run_checks",
      reasonCode: "evidence_unverifiable",
      reasonDetail: appendSourcePolicyDiagnostics({
        baseDetail: `Unverifiable command evidence: ${badCommands
          .map((entry) => `${entry.command} (${entry.status})`)
          .join(", ")}.`,
        refsCount: input.refsCount,
        decision: input.sourcePolicyDecision
      })
    };
  }

  if (!hasTrustedCommandEvidenceProvenance(input.commandEvidence)) {
    return {
      status: "untrusted",
      decision: "run_checks",
      reasonCode: "evidence_unverifiable",
      reasonDetail: appendSourcePolicyDiagnostics({
        baseDetail:
          "Command provenance requirement not met: all required verified commands must be backed by execution log refs.",
        refsCount: input.refsCount,
        decision: input.sourcePolicyDecision
      })
    };
  }

  return {
    status: "trusted",
    decision: "skip_full_rerun",
    reasonCode: "no_trigger",
    reasonDetail: "Evidence is verified, fresh, and complete."
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function compareFingerprint(
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

function isDocsOnlyCompatibilityArtifact(artifact: ReviewerTestEvidenceArtifact): boolean {
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

export async function verifyImplementerTestEvidence(
  input: VerifyImplementerTestEvidenceInput
): Promise<ReviewerTestEvidenceArtifact> {
  const now = input.now ?? new Date();
  if (input.bubbleConfig.review_artifact_type === "document") {
    return {
      schema_version: reviewerTestEvidenceSchemaVersion,
      bubble_id: input.bubbleId,
      pass_envelope_id: input.envelope.id,
      pass_ts: input.envelope.ts,
      round: input.envelope.round,
      verified_at: now.toISOString(),
      status: "trusted",
      decision: "skip_full_rerun",
      reason_code: "no_trigger",
      reason_detail: "docs-only scope, runtime checks not required",
      required_commands: [],
      command_evidence: [],
      git: {
        commit_sha: null,
        status_hash: null,
        dirty: null
      }
    };
  }

  const requiredCommands = normalizeRequiredCommands(input.bubbleConfig);
  const forceSourcePolicyFallback =
    isRecord(input.envelope.payload.metadata) &&
    input.envelope.payload.metadata["test_evidence_policy_force_fallback"] === true;
  const loadedSources = await loadEvidenceSources({
    summary: input.envelope.payload.summary ?? "",
    refs: input.envelope.refs,
    worktreePath: input.worktreePath,
    repoPath: input.repoPath,
    ...(forceSourcePolicyFallback ? { forceSourcePolicyFallback: true } : {})
  });
  const sources = loadedSources.sources;
  const matchedCommandEvidence = requiredCommands.map((command) =>
    buildCommandEvidence(command, sources)
  );
  const commandEvidence = normalizeCommandEvidenceProvenance(matchedCommandEvidence);

  const fingerprint = await readWorktreeFingerprint(input.worktreePath);
  const classified = classifyEvidence({
    commandEvidence,
    requiredCommands,
    fingerprintOk: fingerprint.ok,
    refsCount: input.envelope.refs.length,
    sourcePolicyDecision: loadedSources.sourcePolicyDecision
  });

  const diagnostics = buildEvidenceDiagnostics(loadedSources.sourcePolicyDecision);

  return {
    schema_version: reviewerTestEvidenceSchemaVersion,
    bubble_id: input.bubbleId,
    pass_envelope_id: input.envelope.id,
    pass_ts: input.envelope.ts,
    round: input.envelope.round,
    verified_at: now.toISOString(),
    status: classified.status,
    decision: classified.decision,
    reason_code: classified.reasonCode,
    reason_detail: classified.reasonDetail,
    required_commands: requiredCommands,
    command_evidence: commandEvidence,
    ...(diagnostics !== undefined ? { diagnostics } : {}),
    git: {
      commit_sha: fingerprint.commitSha,
      status_hash: fingerprint.statusHash,
      dirty: fingerprint.dirty
    }
  };
}

export async function writeReviewerTestEvidenceArtifact(
  artifactPath: string,
  artifact: ReviewerTestEvidenceArtifact
): Promise<void> {
  await mkdir(dirname(artifactPath), { recursive: true });
  await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, {
    encoding: "utf8"
  });
}

export async function readReviewerTestEvidenceArtifact(
  artifactPath: string
): Promise<ReviewerTestEvidenceArtifact | undefined> {
  const raw = await readFile(artifactPath, "utf8").catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  });
  if (raw === undefined) {
    return undefined;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      return undefined;
    }
    throw error;
  }
  if (!isRecord(parsed)) {
    return undefined;
  }

  if (parsed.schema_version !== reviewerTestEvidenceSchemaVersion) {
    return undefined;
  }

  const required = [
    "bubble_id",
    "pass_envelope_id",
    "pass_ts",
    "round",
    "verified_at",
    "status",
    "decision",
    "reason_code",
    "reason_detail",
    "required_commands",
    "command_evidence",
    "git"
  ];
  for (const key of required) {
    if (!(key in parsed)) {
      return undefined;
    }
  }

  return parsed as unknown as ReviewerTestEvidenceArtifact;
}

export async function resolveReviewerTestExecutionDirective(
  input: ResolveReviewerTestExecutionDirectiveInput
): Promise<ReviewerTestExecutionDirective> {
  try {
    const artifact = await readReviewerTestEvidenceArtifact(input.artifactPath);

    if (artifact === undefined) {
      if (input.reviewArtifactType === "document") {
        return createDocsOnlySkipDirective();
      }

      return {
        skip_full_rerun: false,
        reason_code: "evidence_missing",
        reason_detail: summarizeReason(
          "evidence_missing",
          "No reviewer test verification artifact found for the latest implementer handoff."
        ),
        verification_status: "missing"
      };
    }

    return resolveReviewerTestExecutionDirectiveFromArtifact({
      artifact,
      worktreePath: input.worktreePath,
      ...(input.reviewArtifactType !== undefined
        ? { reviewArtifactType: input.reviewArtifactType }
        : {})
    });
  } catch (error: unknown) {
    if (input.reviewArtifactType === "document") {
      return createDocsOnlySkipDirective();
    }

    const readFailureDetail =
      error instanceof Error && error.message.trim().length > 0
        ? `Reviewer test verification artifact read failed: ${error.message}`
        : "Reviewer test verification artifact read failed.";
    return {
      skip_full_rerun: false,
      reason_code: "evidence_unverifiable",
      reason_detail: summarizeReason("evidence_unverifiable", readFailureDetail),
      verification_status: "untrusted"
    };
  }
}

export async function resolveReviewerTestExecutionDirectiveFromArtifact(
  input: ResolveReviewerTestExecutionDirectiveFromArtifactInput
): Promise<ReviewerTestExecutionDirective> {
  if (input.artifact.status !== "trusted") {
    if (input.reviewArtifactType === "document") {
      return createDocsOnlySkipDirective(
        input.artifact.reason_detail.trim().length > 0
          ? input.artifact.reason_detail
          : docsOnlyRuntimeChecksNotRequiredDetail
      );
    }

    return {
      skip_full_rerun: false,
      reason_code: input.artifact.reason_code,
      reason_detail: summarizeReason(input.artifact.reason_code, input.artifact.reason_detail),
      verification_status: "untrusted"
    };
  }

  const docsOnlyCompatibilityMatch =
    input.reviewArtifactType === undefined &&
    isDocsOnlyCompatibilityArtifact(input.artifact);
  if (input.reviewArtifactType === "document" || docsOnlyCompatibilityMatch) {
    return createDocsOnlySkipDirective(
      input.artifact.reason_detail.trim().length > 0
        ? input.artifact.reason_detail
        : docsOnlyRuntimeChecksNotRequiredDetail
    );
  }

  const current = await readWorktreeFingerprint(input.worktreePath);
  const freshness = compareFingerprint(input.artifact, current);
  if (freshness.stale) {
    return {
      skip_full_rerun: false,
      reason_code: "evidence_stale",
      reason_detail: summarizeReason("evidence_stale", freshness.detail),
      verification_status: "untrusted"
    };
  }

  return {
    skip_full_rerun: true,
    reason_code: "no_trigger",
    reason_detail: summarizeReason("no_trigger", input.artifact.reason_detail),
    verification_status: "trusted"
  };
}
