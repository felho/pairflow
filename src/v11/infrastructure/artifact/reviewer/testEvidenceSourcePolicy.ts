import { readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

import type { ReviewerTestEvidenceArtifact } from "../../../shared/reviewer/testEvidence.js";

export interface EvidenceSource {
  kind: "summary" | "ref";
  id: string;
  text: string;
}

type EvidenceSourceRejectReason =
  | "source_not_whitelisted"
  | "source_outside_repo_scope"
  | "source_protocol_not_allowed"
  | "source_canonicalization_failed"
  | "source_duplicate_ref";

export interface EvidenceSourcePolicyRejectedRef {
  input_ref: string;
  reason: EvidenceSourceRejectReason;
}

export interface EvidenceSourcePolicyDecision {
  allowed_ref_paths: string[];
  rejected_refs: EvidenceSourcePolicyRejectedRef[];
  fallback_applied: boolean;
  fallback_context?: string;
}

interface LoadEvidenceSourcesInput {
  summary: string;
  refs: string[];
  worktreePath: string;
  repoPath: string;
  forceSourcePolicyFallback?: boolean;
}

const maxRefSourceChars = 60_000;
const sourcePolicyFallbackMarker = "source_policy_fallback";
const evidencePolicyDirPrefix = ".pairflow/evidence/";
const forcedFallbackErrorMessage = "forced source policy fallback";
const forcedFallbackContextMarker = "forced_fallback";

function isPathInside(parentPath: string, childPath: string): boolean {
  const rel = relative(resolve(parentPath), resolve(childPath));
  return rel === "" || !rel.startsWith("..");
}

function normalizeRelativePath(pathValue: string): string {
  return pathValue.split("\\").join("/");
}

function isWhitelistedEvidenceLogPath(
  canonicalPath: string,
  canonicalWorktreePath: string,
  canonicalRepoPath: string
): boolean {
  const roots = [canonicalWorktreePath, canonicalRepoPath];
  for (const root of roots) {
    if (!isPathInside(root, canonicalPath)) {
      continue;
    }

    const rel = normalizeRelativePath(relative(root, canonicalPath));
    if (!rel.startsWith(evidencePolicyDirPrefix)) {
      continue;
    }

    const fileName = rel.slice(evidencePolicyDirPrefix.length);
    if (fileName.length === 0 || fileName.includes("/")) {
      continue;
    }
    if (!fileName.endsWith(".log")) {
      continue;
    }
    return true;
  }
  return false;
}

function resolveRefCandidates(refPath: string, worktreePath: string, repoPath: string): string[] {
  if (isAbsolute(refPath)) {
    return [resolve(refPath)];
  }

  const resolvedFromWorktree = resolve(worktreePath, refPath);
  const resolvedFromRepo = resolve(repoPath, refPath);
  if (resolvedFromWorktree === resolvedFromRepo) {
    return [resolvedFromWorktree];
  }
  return [resolvedFromWorktree, resolvedFromRepo];
}

function pickRejectedReason(
  reasons: Set<EvidenceSourceRejectReason>,
  duplicateDetected: boolean
): EvidenceSourceRejectReason {
  if (reasons.has("source_protocol_not_allowed")) {
    return "source_protocol_not_allowed";
  }
  if (reasons.has("source_canonicalization_failed")) {
    return "source_canonicalization_failed";
  }
  if (reasons.has("source_outside_repo_scope")) {
    return "source_outside_repo_scope";
  }
  if (reasons.has("source_not_whitelisted")) {
    return "source_not_whitelisted";
  }
  if (duplicateDetected) {
    return "source_duplicate_ref";
  }
  return "source_not_whitelisted";
}

function sourcePolicyDiagnosticsSuffix(input: {
  refsCount: number;
  decision: EvidenceSourcePolicyDecision;
}): string {
  const notes: string[] = [];
  if (input.refsCount === 0) {
    notes.push("No --ref inputs were provided.");
  } else if (
    input.decision.allowed_ref_paths.length === 0 &&
    input.decision.rejected_refs.length > 0
  ) {
    notes.push("All --ref inputs were rejected by source policy.");
  } else if (input.decision.rejected_refs.length > 0) {
    notes.push(`Source policy rejected ${input.decision.rejected_refs.length} --ref input(s).`);
  }

  if (input.decision.fallback_applied) {
    if (input.decision.fallback_context !== undefined) {
      notes.push(`${sourcePolicyFallbackMarker}(${input.decision.fallback_context})`);
    } else {
      notes.push(sourcePolicyFallbackMarker);
    }
  }

  if (notes.length === 0) {
    return "";
  }
  return ` ${notes.join(" ")}`;
}

export function appendSourcePolicyDiagnostics(input: {
  baseDetail: string;
  refsCount: number;
  decision: EvidenceSourcePolicyDecision;
}): string {
  return `${input.baseDetail}${sourcePolicyDiagnosticsSuffix({
    refsCount: input.refsCount,
    decision: input.decision
  })}`.trim();
}

export function buildEvidenceDiagnostics(
  decision: EvidenceSourcePolicyDecision
): ReviewerTestEvidenceArtifact["diagnostics"] {
  return {
    source_policy: {
      allowed_ref_paths: [...decision.allowed_ref_paths],
      rejected_refs: [...decision.rejected_refs],
      ...(decision.fallback_applied
        ? { mode_marker: sourcePolicyFallbackMarker }
        : {}),
      ...(decision.fallback_context !== undefined
        ? { fallback_context: decision.fallback_context }
        : {})
    }
  };
}

async function loadPolicyEvaluatedSources(input: {
  refs: string[];
  worktreePath: string;
  repoPath: string;
  canonicalWorktreePath: string;
  canonicalRepoPath: string;
}): Promise<{
  refSources: EvidenceSource[];
  allowedRefPaths: string[];
  rejectedRefs: EvidenceSourcePolicyRejectedRef[];
}> {
  const refSources: EvidenceSource[] = [];
  const allowedRefPaths: string[] = [];
  const rejectedRefs: EvidenceSourcePolicyRejectedRef[] = [];
  const seenRefIds = new Set<string>();

  for (const ref of input.refs) {
    const trimmedRef = ref.trim();
    const hashIndex = trimmedRef.indexOf("#");
    const withoutFragment = hashIndex >= 0 ? trimmedRef.slice(0, hashIndex) : trimmedRef;
    if (withoutFragment.length === 0) {
      rejectedRefs.push({
        input_ref: ref,
        reason: "source_not_whitelisted"
      });
      continue;
    }

    if (withoutFragment.includes("://")) {
      rejectedRefs.push({
        input_ref: ref,
        reason: "source_protocol_not_allowed"
      });
      continue;
    }

    const candidates = resolveRefCandidates(withoutFragment, input.worktreePath, input.repoPath);
    const canonicalizedRejectReasons = new Set<EvidenceSourceRejectReason>();
    const unresolvedCandidateRejectReasons = new Set<EvidenceSourceRejectReason>();
    let duplicateDetected = false;
    let accepted = false;

    for (const candidate of candidates) {
      const canonicalPath = await realpath(candidate).catch(() => undefined);
      if (canonicalPath === undefined) {
        unresolvedCandidateRejectReasons.add("source_canonicalization_failed");
        continue;
      }

      if (
        !isPathInside(input.canonicalWorktreePath, canonicalPath) &&
        !isPathInside(input.canonicalRepoPath, canonicalPath)
      ) {
        canonicalizedRejectReasons.add("source_outside_repo_scope");
        continue;
      }

      if (
        !isWhitelistedEvidenceLogPath(
          canonicalPath,
          input.canonicalWorktreePath,
          input.canonicalRepoPath
        )
      ) {
        canonicalizedRejectReasons.add("source_not_whitelisted");
        continue;
      }

      if (seenRefIds.has(canonicalPath)) {
        duplicateDetected = true;
        continue;
      }

      const content = await readFile(canonicalPath, "utf8").catch(() => undefined);
      if (content === undefined) {
        canonicalizedRejectReasons.add("source_canonicalization_failed");
        continue;
      }

      seenRefIds.add(canonicalPath);
      allowedRefPaths.push(canonicalPath);
      refSources.push({
        kind: "ref",
        id: canonicalPath,
        text: content.slice(0, maxRefSourceChars)
      });
      accepted = true;
      break;
    }

    if (!accepted) {
      if (duplicateDetected && canonicalizedRejectReasons.size === 0) {
        rejectedRefs.push({
          input_ref: ref,
          reason: "source_duplicate_ref"
        });
        continue;
      }
      const rejectReasons = canonicalizedRejectReasons.size > 0
        ? canonicalizedRejectReasons
        : unresolvedCandidateRejectReasons;
      rejectedRefs.push({
        input_ref: ref,
        reason: pickRejectedReason(rejectReasons, duplicateDetected)
      });
    }
  }

  return {
    refSources,
    allowedRefPaths,
    rejectedRefs
  };
}

function formatFallbackContext(error: unknown): string | undefined {
  if (!(error instanceof Error)) {
    return "non_error_thrown";
  }

  const message = error.message.trim().replace(/\s+/gu, " ");
  const descriptor = message.length > 0 ? message : error.name.trim();
  if (descriptor.length === 0) {
    return "unknown_error";
  }
  return descriptor.slice(0, 140);
}

export async function loadEvidenceSources(
  input: LoadEvidenceSourcesInput
): Promise<{ sources: EvidenceSource[]; sourcePolicyDecision: EvidenceSourcePolicyDecision }> {
  const sources: EvidenceSource[] = [];
  const summary = input.summary.trim();
  if (summary.length > 0) {
    sources.push({
      kind: "summary",
      id: "pass.summary",
      text: summary
    });
  }

  let sourcePolicyDecision: EvidenceSourcePolicyDecision;
  let refSources: EvidenceSource[] = [];

  try {
    if (input.forceSourcePolicyFallback === true) {
      throw new Error(forcedFallbackErrorMessage);
    }

    const canonicalWorktreePath = await realpath(input.worktreePath);
    const canonicalRepoPath = await realpath(input.repoPath);
    const evaluated = await loadPolicyEvaluatedSources({
      refs: input.refs,
      worktreePath: input.worktreePath,
      repoPath: input.repoPath,
      canonicalWorktreePath,
      canonicalRepoPath
    });
    refSources = evaluated.refSources;
    sourcePolicyDecision = {
      allowed_ref_paths: evaluated.allowedRefPaths,
      rejected_refs: evaluated.rejectedRefs,
      fallback_applied: false
    };
  } catch (error: unknown) {
    const fallbackContext =
      error instanceof Error && error.message === forcedFallbackErrorMessage
        ? forcedFallbackContextMarker
        : formatFallbackContext(error);

    const fallbackWorktreePath = await realpath(input.worktreePath).catch(() =>
      resolve(input.worktreePath)
    );
    const fallbackRepoPath = await realpath(input.repoPath).catch(() =>
      resolve(input.repoPath)
    );
    const evaluated = await loadPolicyEvaluatedSources({
      refs: input.refs,
      worktreePath: input.worktreePath,
      repoPath: input.repoPath,
      canonicalWorktreePath: fallbackWorktreePath,
      canonicalRepoPath: fallbackRepoPath
    });
    refSources = evaluated.refSources;
    sourcePolicyDecision = {
      allowed_ref_paths: evaluated.allowedRefPaths,
      rejected_refs: evaluated.rejectedRefs,
      fallback_applied: true,
      ...(fallbackContext !== undefined
        ? { fallback_context: fallbackContext }
        : {})
    };
  }

  sources.push(...refSources);
  return {
    sources,
    sourcePolicyDecision
  };
}
