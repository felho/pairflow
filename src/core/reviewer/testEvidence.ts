import { createHash } from "node:crypto"
import { mkdir, readFile, realpath, writeFile } from "node:fs/promises"
import { dirname, isAbsolute, join, relative, resolve } from "node:path"

import { runGit } from "../workspace/git.js"
import type { BubbleConfig, ReviewArtifactType } from "../../types/bubble.js"
import type { ProtocolEnvelope } from "../../types/protocol.js"

export const reviewerTestEvidenceSchemaVersion = 1 as const

export type ReviewerTestEvidenceStatus = "trusted" | "untrusted"

export type ReviewerTestDecision = "skip_full_rerun" | "run_checks"

export type ReviewerTestReasonCode =
  | "evidence_missing"
  | "evidence_unverifiable"
  | "evidence_stale"
  | "no_trigger"

export type ReviewerTestCommandStatus =
  | "verified"
  | "missing"
  | "unverifiable"
  | "failed"

export interface ReviewerTestCommandEvidence {
  command: string;
  required: boolean;
  source: "summary" | "ref" | "none";
  source_ref?: string;
  matched_text?: string;
  status: ReviewerTestCommandStatus;
  exit_code: 0 | 1 | null;
  explicit_exit_status: boolean;
  completion_marker: boolean;
}

export interface ReviewerTestEvidenceArtifact {
  schema_version: typeof reviewerTestEvidenceSchemaVersion;
  bubble_id: string;
  pass_envelope_id: string;
  pass_ts: string;
  round: number;
  verified_at: string;
  status: ReviewerTestEvidenceStatus;
  decision: ReviewerTestDecision;
  reason_code: ReviewerTestReasonCode;
  reason_detail: string;
  required_commands: string[];
  command_evidence: ReviewerTestCommandEvidence[];
  diagnostics?: ReviewerTestEvidenceDiagnostics;
  git: {
    commit_sha: string | null;
    status_hash: string | null;
    dirty: boolean | null;
  };
}

export interface ReviewerTestExecutionDirective {
  skip_full_rerun: boolean;
  reason_code: ReviewerTestReasonCode;
  reason_detail: string;
  verification_status: "trusted" | "untrusted" | "missing";
}

export interface VerifyImplementerTestEvidenceInput {
  bubbleId: string;
  bubbleConfig: BubbleConfig;
  envelope: ProtocolEnvelope;
  worktreePath: string;
  repoPath: string;
  now?: Date;
}

export interface ResolveReviewerTestExecutionDirectiveInput {
  artifactPath: string;
  worktreePath: string;
  reviewArtifactType?: ReviewArtifactType;
}

interface EvidenceSource {
  kind: "summary" | "ref";
  id: string;
  text: string;
}

interface CommandMatch {
  source: EvidenceSource;
  snippet: string;
  explicitExitSuccess: boolean;
  explicitExitFailure: boolean;
  completionMarker: boolean;
  passToken: boolean;
}

interface WorktreeFingerprint {
  commitSha: string | null;
  statusHash: string | null;
  dirty: boolean | null;
  ok: boolean;
}

type EvidenceSourceRejectReason =
  | "source_not_whitelisted"
  | "source_outside_repo_scope"
  | "source_protocol_not_allowed"
  | "source_canonicalization_failed"
  | "source_duplicate_ref"

interface EvidenceSourcePolicyRejectedRef {
  input_ref: string;
  reason: EvidenceSourceRejectReason;
}

interface EvidenceSourcePolicyDecision {
  allowed_ref_paths: string[];
  rejected_refs: EvidenceSourcePolicyRejectedRef[];
  fallback_applied: boolean;
  fallback_context?: string;
}

interface ReviewerTestEvidenceDiagnostics {
  source_policy: {
    allowed_ref_paths: string[];
    rejected_refs: EvidenceSourcePolicyRejectedRef[];
    mode_marker?: "source_policy_fallback";
    fallback_context?: string;
  };
}

const maxRefSourceChars = 60_000
const docsOnlyRuntimeChecksNotRequiredDetail = "docs-only scope, runtime checks not required"
const sourcePolicyFallbackMarker = "source_policy_fallback"
const evidencePolicyDirPrefix = ".pairflow/evidence/"
const forcedFallbackErrorMessage = "forced source policy fallback"
const forcedFallbackContextMarker = "forced_fallback"

function isPathInside(parentPath: string, childPath: string): boolean {
  const rel = relative(resolve(parentPath), resolve(childPath))
  return rel === "" || !rel.startsWith("..")
}

function normalizeRelativePath(pathValue: string): string {
  return pathValue.split("\\").join("/")
}

function isWhitelistedEvidenceLogPath(
  canonicalPath: string,
  canonicalWorktreePath: string,
  canonicalRepoPath: string
): boolean {
  const roots = [canonicalWorktreePath, canonicalRepoPath]
  for (const root of roots) {
    if (!isPathInside(root, canonicalPath)) {
      continue
    }

    const rel = normalizeRelativePath(relative(root, canonicalPath))
    if (!rel.startsWith(evidencePolicyDirPrefix)) {
      continue
    }

    const fileName = rel.slice(evidencePolicyDirPrefix.length)
    if (fileName.length === 0 || fileName.includes("/")) {
      continue
    }
    if (!fileName.endsWith(".log")) {
      continue
    }
    return true
  }
  return false
}

function resolveRefCandidates(refPath: string, worktreePath: string, repoPath: string): string[] {
  if (isAbsolute(refPath)) {
    return [resolve(refPath)]
  }

  const resolvedFromWorktree = resolve(worktreePath, refPath)
  const resolvedFromRepo = resolve(repoPath, refPath)
  if (resolvedFromWorktree === resolvedFromRepo) {
    return [resolvedFromWorktree]
  }
  return [resolvedFromWorktree, resolvedFromRepo]
}

function pickRejectedReason(
  reasons: Set<EvidenceSourceRejectReason>,
  duplicateDetected: boolean
): EvidenceSourceRejectReason {
  if (reasons.has("source_protocol_not_allowed")) {
    return "source_protocol_not_allowed"
  }
  if (reasons.has("source_canonicalization_failed")) {
    return "source_canonicalization_failed"
  }
  if (reasons.has("source_outside_repo_scope")) {
    return "source_outside_repo_scope"
  }
  if (reasons.has("source_not_whitelisted")) {
    return "source_not_whitelisted"
  }
  if (duplicateDetected) {
    return "source_duplicate_ref"
  }
  return "source_not_whitelisted"
}

function sourcePolicyDiagnosticsSuffix(input: {
  refsCount: number;
  decision: EvidenceSourcePolicyDecision;
}): string {
  const notes: string[] = []
  if (input.refsCount === 0) {
    notes.push("No --ref inputs were provided.")
  } else if (
    input.decision.allowed_ref_paths.length === 0 &&
    input.decision.rejected_refs.length > 0
  ) {
    notes.push("All --ref inputs were rejected by source policy.")
  } else if (input.decision.rejected_refs.length > 0) {
    notes.push(`Source policy rejected ${input.decision.rejected_refs.length} --ref input(s).`)
  }

  if (input.decision.fallback_applied) {
    if (input.decision.fallback_context !== undefined) {
      notes.push(`${sourcePolicyFallbackMarker}(${input.decision.fallback_context})`)
    } else {
      notes.push(sourcePolicyFallbackMarker)
    }
  }

  if (notes.length === 0) {
    return ""
  }
  return ` ${notes.join(" ")}`
}

function formatReasonDetailWithPolicy(input: {
  baseDetail: string;
  refsCount: number;
  decision: EvidenceSourcePolicyDecision;
}): string {
  return `${input.baseDetail}${sourcePolicyDiagnosticsSuffix({
    refsCount: input.refsCount,
    decision: input.decision
  })}`.trim()
}

function buildEvidenceDiagnostics(
  decision: EvidenceSourcePolicyDecision
): ReviewerTestEvidenceDiagnostics {
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
  }
}

function formatFallbackContext(error: unknown): string | undefined {
  if (!(error instanceof Error)) {
    return "non_error_thrown"
  }

  const message = error.message.trim().replace(/\s+/gu, " ")
  const descriptor = message.length > 0 ? message : error.name.trim()
  if (descriptor.length === 0) {
    return "unknown_error"
  }
  return descriptor.slice(0, 140)
}

function normalizeRequiredCommands(config: BubbleConfig): string[] {
  const commands = [config.commands.typecheck, config.commands.test]
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
  return [...new Set(commands)]
}

function hashText(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex")
}

async function readWorktreeFingerprint(worktreePath: string): Promise<WorktreeFingerprint> {
  const commit = await runGit(["rev-parse", "HEAD"], {
    cwd: worktreePath,
    allowFailure: true
  })
  const status = await runGit(["status", "--porcelain", "--untracked-files=all"], {
    cwd: worktreePath,
    allowFailure: true
  })

  if (commit.exitCode !== 0 || status.exitCode !== 0) {
    return {
      commitSha: null,
      statusHash: null,
      dirty: null,
      ok: false
    }
  }

  const statusRaw = status.stdout.replace(/\r\n/gu, "\n")
  return {
    commitSha: commit.stdout.trim(),
    statusHash: hashText(statusRaw),
    dirty: statusRaw.trim().length > 0,
    ok: true
  }
}

async function loadEvidenceSources(input: {
  summary: string;
  refs: string[];
  worktreePath: string;
  repoPath: string;
  forceSourcePolicyFallback?: boolean;
}): Promise<{ sources: EvidenceSource[]; sourcePolicyDecision: EvidenceSourcePolicyDecision }> {
  const sources: EvidenceSource[] = []
  const summary = input.summary.trim()
  if (summary.length > 0) {
    sources.push({
      kind: "summary",
      id: "pass.summary",
      text: summary
    })
  }

  const evaluatePolicy = async (
    canonicalWorktreePath: string,
    canonicalRepoPath: string
  ): Promise<{
    refSources: EvidenceSource[];
    allowedRefPaths: string[];
    rejectedRefs: EvidenceSourcePolicyRejectedRef[];
  }> => {
    const refSources: EvidenceSource[] = []
    const allowedRefPaths: string[] = []
    const rejectedRefs: EvidenceSourcePolicyRejectedRef[] = []
    const seenRefIds = new Set<string>()

    for (const ref of input.refs) {
      const trimmedRef = ref.trim()
      const hashIndex = trimmedRef.indexOf("#")
      const withoutFragment = hashIndex >= 0 ? trimmedRef.slice(0, hashIndex) : trimmedRef
      if (withoutFragment.length === 0) {
        rejectedRefs.push({
          input_ref: ref,
          reason: "source_not_whitelisted"
        })
        continue
      }

      if (withoutFragment.includes("://")) {
        rejectedRefs.push({
          input_ref: ref,
          reason: "source_protocol_not_allowed"
        })
        continue
      }

      const candidates = resolveRefCandidates(withoutFragment, input.worktreePath, input.repoPath)
      const canonicalizedRejectReasons = new Set<EvidenceSourceRejectReason>()
      const unresolvedCandidateRejectReasons = new Set<EvidenceSourceRejectReason>()
      let duplicateDetected = false
      let accepted = false

      for (const candidate of candidates) {
        const canonicalPath = await realpath(candidate).catch(() => undefined)
        if (canonicalPath === undefined) {
          unresolvedCandidateRejectReasons.add("source_canonicalization_failed")
          continue
        }

        if (
          !isPathInside(canonicalWorktreePath, canonicalPath) &&
          !isPathInside(canonicalRepoPath, canonicalPath)
        ) {
          canonicalizedRejectReasons.add("source_outside_repo_scope")
          continue
        }

        if (
          !isWhitelistedEvidenceLogPath(
            canonicalPath,
            canonicalWorktreePath,
            canonicalRepoPath
          )
        ) {
          canonicalizedRejectReasons.add("source_not_whitelisted")
          continue
        }

        if (seenRefIds.has(canonicalPath)) {
          duplicateDetected = true
          continue
        }

        const content = await readFile(canonicalPath, "utf8").catch(() => undefined)
        if (content === undefined) {
          // Phase-1 contract maps canonicalization/read failures to the same reason code.
          canonicalizedRejectReasons.add("source_canonicalization_failed")
          continue
        }

        seenRefIds.add(canonicalPath)
        allowedRefPaths.push(canonicalPath)
        refSources.push({
          kind: "ref",
          id: canonicalPath,
          text: content.slice(0, maxRefSourceChars)
        })
        accepted = true
        break
      }

      if (!accepted) {
        if (duplicateDetected && canonicalizedRejectReasons.size === 0) {
          rejectedRefs.push({
            input_ref: ref,
            reason: "source_duplicate_ref"
          })
          continue
        }
        const rejectReasons = canonicalizedRejectReasons.size > 0
          ? canonicalizedRejectReasons
          : unresolvedCandidateRejectReasons
        rejectedRefs.push({
          input_ref: ref,
          reason: pickRejectedReason(rejectReasons, duplicateDetected)
        })
      }
    }

    return {
      refSources,
      allowedRefPaths,
      rejectedRefs
    }
  }

  let sourcePolicyDecision: EvidenceSourcePolicyDecision
  let refSources: EvidenceSource[] = []

  try {
    if (input.forceSourcePolicyFallback === true) {
      throw new Error(forcedFallbackErrorMessage)
    }

    const canonicalWorktreePath = await realpath(input.worktreePath)
    const canonicalRepoPath = await realpath(input.repoPath)
    const evaluated = await evaluatePolicy(canonicalWorktreePath, canonicalRepoPath)
    refSources = evaluated.refSources
    sourcePolicyDecision = {
      allowed_ref_paths: evaluated.allowedRefPaths,
      rejected_refs: evaluated.rejectedRefs,
      fallback_applied: false
    }
  } catch (error: unknown) {
    const fallbackContext =
      error instanceof Error && error.message === forcedFallbackErrorMessage
        ? forcedFallbackContextMarker
        : formatFallbackContext(error)

    // Fallback mode keeps policy strict while allowing trust-anchor bootstrap by path resolution.
    const fallbackWorktreePath = await realpath(input.worktreePath).catch(() =>
      resolve(input.worktreePath)
    )
    const fallbackRepoPath = await realpath(input.repoPath).catch(() =>
      resolve(input.repoPath)
    )
    const evaluated = await evaluatePolicy(fallbackWorktreePath, fallbackRepoPath)
    refSources = evaluated.refSources
    sourcePolicyDecision = {
      allowed_ref_paths: evaluated.allowedRefPaths,
      rejected_refs: evaluated.rejectedRefs,
      fallback_applied: true,
      ...(fallbackContext !== undefined
        ? { fallback_context: fallbackContext }
        : {})
    }
  }

  sources.push(...refSources)
  return {
    sources,
    sourcePolicyDecision
  }
}

function findAllCommandMatches(command: string, sources: EvidenceSource[]): CommandMatch[] {
  const commandLower = command.toLowerCase()
  const matches: CommandMatch[] = []

  for (const source of sources) {
    const lower = source.text.toLowerCase()
    let startAt = 0
    while (startAt < lower.length) {
      const index = lower.indexOf(commandLower, startAt)
      if (index < 0) {
        break
      }

      const snippetStart = Math.max(0, index - 220)
      const snippetEnd = Math.min(source.text.length, index + command.length + 220)
      const snippet = source.text.slice(snippetStart, snippetEnd)
      const snippetLower = snippet.toLowerCase()

      const explicitExitSuccess =
        /\b(?:exit(?:\s*code)?|command\s+exit(?:\s*code)?|process\s+exit(?:\s*code)?|returned)\s*[:=]?\s*0\b/iu.test(
          snippetLower
        )
      const explicitExitFailure =
        /\b(?:exit(?:\s*code)?|command\s+exit(?:\s*code)?|process\s+exit(?:\s*code)?|returned)\s*[:=]?\s*[1-9][0-9]*\b/iu.test(
          snippetLower
        ) ||
        /\b(?:found|with|had)\s+[1-9][0-9]*\s+errors?\b/iu.test(snippetLower) ||
        /\b(?:[1-9][0-9]*\s+failed(?:\s+tests?)?|tests?\s+failed|command\s+failed)\b/iu.test(
          snippetLower
        )

      const completionMarker = commandLower.includes("typecheck") || commandLower.includes("tsc")
        ? /\b(?:found\s+0\s+errors?|0\s+errors?|no\s+type\s+errors?|no\s+errors?|pass(?:ed)?|success(?:ful)?)\b/iu.test(snippetLower)
        : commandLower.includes("test")
        ? /\b(?:\d+\s+tests?\b|test\s+files?\b|all\s+tests\s+passed|no\s+tests\s+failed|pass(?:ed)?\b)\b/iu.test(snippetLower)
        : /\b(?:pass(?:ed)?|success(?:ful)?|ok)\b/iu.test(snippetLower)

      const passToken = /\b(?:pass(?:ed)?|success(?:ful)?|ok)\b/iu.test(snippetLower)

      matches.push({
        source,
        snippet,
        explicitExitSuccess,
        explicitExitFailure,
        completionMarker,
        passToken
      })

      startAt = index + commandLower.length
    }
  }

  return matches
}

function scoreMatch(match: CommandMatch): number {
  let score = 0
  if (match.explicitExitSuccess) {
    score += 3
  }
  if (match.completionMarker) {
    score += 2
  }
  if (match.passToken) {
    score += 1
  }
  if (match.explicitExitFailure) {
    score -= 4
  }
  if (match.source.kind === "ref") {
    score += 1
  }
  return score
}

function buildCommandEvidence(command: string, sources: EvidenceSource[]): ReviewerTestCommandEvidence {
  const commandLower = command.toLowerCase()
  const isTypecheckCommand = commandLower.includes("typecheck") || commandLower.includes("tsc")
  const matches = findAllCommandMatches(command, sources)
  if (matches.length === 0) {
    return {
      command,
      required: true,
      source: "none",
      status: "missing",
      exit_code: null,
      explicit_exit_status: false,
      completion_marker: false
    }
  }

  const bestMatch = [...matches].sort((left, right) => scoreMatch(right) - scoreMatch(left))[0]
  if (bestMatch === undefined) {
    return {
      command,
      required: true,
      source: "none",
      status: "missing",
      exit_code: null,
      explicit_exit_status: false,
      completion_marker: false
    }
  }

  let status: ReviewerTestCommandStatus = "unverifiable"
  let exitCode: 0 | 1 | null = null
  if (bestMatch.explicitExitFailure) {
    status = "failed"
    exitCode = 1
  } else if (
    bestMatch.completionMarker &&
    (bestMatch.explicitExitSuccess || bestMatch.passToken || isTypecheckCommand)
  ) {
    status = "verified"
    exitCode = 0
  }

  return {
    command,
    required: true,
    source: bestMatch.source.kind,
    ...(bestMatch.source.kind === "ref" ? { source_ref: bestMatch.source.id } : {}),
    matched_text: bestMatch.snippet,
    status,
    exit_code: exitCode,
    explicit_exit_status: bestMatch.explicitExitSuccess,
    completion_marker: bestMatch.completionMarker
  }
}

function hasTrustedProvenance(commandEvidence: ReviewerTestCommandEvidence[]): boolean {
  const verified = commandEvidence.filter((entry) => entry.status === "verified")
  if (verified.length === 0) {
    return false
  }

  // Require every verified command to be log-file-backed.
  // Summary text can claim explicit exit markers without proving execution.
  return verified.every((entry) => entry.source === "ref")
}

function normalizeCommandEvidenceProvenance(
  commandEvidence: ReviewerTestCommandEvidence[]
): ReviewerTestCommandEvidence[] {
  if (hasTrustedProvenance(commandEvidence)) {
    return commandEvidence
  }

  return commandEvidence.map((entry) => {
    if (entry.status !== "verified" || entry.source !== "summary") {
      return entry
    }
    return {
      ...entry,
      status: "unverifiable",
      exit_code: null
    }
  })
}

function summarizeReason(reasonCode: ReviewerTestReasonCode, detail: string): string {
  if (detail.trim().length > 0) {
    return detail
  }

  switch (reasonCode) {
    case "evidence_missing":
      return "Latest implementer handoff did not include evidence for all required checks."
    case "evidence_unverifiable":
      return "Latest implementer evidence could not be verified for command provenance, exit status, or completion markers."
    case "evidence_stale":
      return "Verified evidence no longer matches current worktree fingerprint."
    case "no_trigger":
      return "Evidence is verified, fresh, and complete."
    default:
      return "Unknown reviewer test decision reason."
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
  }
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
      reasonDetail: formatReasonDetailWithPolicy({
        baseDetail: "Bubble config does not define required test/typecheck commands.",
        refsCount: input.refsCount,
        decision: input.sourcePolicyDecision
      })
    }
  }

  if (!input.fingerprintOk) {
    return {
      status: "untrusted",
      decision: "run_checks",
      reasonCode: "evidence_unverifiable",
      reasonDetail: formatReasonDetailWithPolicy({
        baseDetail: "Could not bind evidence to a worktree fingerprint.",
        refsCount: input.refsCount,
        decision: input.sourcePolicyDecision
      })
    }
  }

  const missingCommands = input.commandEvidence
    .filter((entry) => entry.status === "missing")
    .map((entry) => entry.command)
  if (missingCommands.length > 0) {
    return {
      status: "untrusted",
      decision: "run_checks",
      reasonCode: "evidence_missing",
      reasonDetail: formatReasonDetailWithPolicy({
        baseDetail: `Missing command evidence: ${missingCommands.join(", ")}.`,
        refsCount: input.refsCount,
        decision: input.sourcePolicyDecision
      })
    }
  }

  const badCommands = input.commandEvidence.filter(
    (entry) => entry.status === "failed" || entry.status === "unverifiable"
  )
  if (badCommands.length > 0) {
    return {
      status: "untrusted",
      decision: "run_checks",
      reasonCode: "evidence_unverifiable",
      reasonDetail: formatReasonDetailWithPolicy({
        baseDetail: `Unverifiable command evidence: ${badCommands
          .map((entry) => `${entry.command} (${entry.status})`)
          .join(", ")}.`,
        refsCount: input.refsCount,
        decision: input.sourcePolicyDecision
      })
    }
  }

  if (!hasTrustedProvenance(input.commandEvidence)) {
    return {
      status: "untrusted",
      decision: "run_checks",
      reasonCode: "evidence_unverifiable",
      reasonDetail: formatReasonDetailWithPolicy({
        baseDetail:
          "Command provenance requirement not met: all required verified commands must be backed by execution log refs.",
        refsCount: input.refsCount,
        decision: input.sourcePolicyDecision
      })
    }
  }

  return {
    status: "trusted",
    decision: "skip_full_rerun",
    reasonCode: "no_trigger",
    reasonDetail: "Evidence is verified, fresh, and complete."
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function resolveReviewerTestEvidenceArtifactPath(artifactsDir: string): string {
  return join(artifactsDir, "reviewer-test-verification.json")
}

export async function verifyImplementerTestEvidence(
  input: VerifyImplementerTestEvidenceInput
): Promise<ReviewerTestEvidenceArtifact> {
  const now = input.now ?? new Date()
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
    }
  }

  const requiredCommands = normalizeRequiredCommands(input.bubbleConfig)
  const forceSourcePolicyFallback =
    isRecord(input.envelope.payload.metadata) &&
    input.envelope.payload.metadata["test_evidence_policy_force_fallback"] === true
  const loadedSources = await loadEvidenceSources({
    summary: input.envelope.payload.summary ?? "",
    refs: input.envelope.refs,
    worktreePath: input.worktreePath,
    repoPath: input.repoPath,
    ...(forceSourcePolicyFallback ? { forceSourcePolicyFallback: true } : {})
  })
  const sources = loadedSources.sources
  const matchedCommandEvidence = requiredCommands.map((command) =>
    buildCommandEvidence(command, sources)
  )
  const commandEvidence = normalizeCommandEvidenceProvenance(matchedCommandEvidence)

  const fingerprint = await readWorktreeFingerprint(input.worktreePath)
  const classified = classifyEvidence({
    commandEvidence,
    requiredCommands,
    fingerprintOk: fingerprint.ok,
    refsCount: input.envelope.refs.length,
    sourcePolicyDecision: loadedSources.sourcePolicyDecision
  })

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
    diagnostics: buildEvidenceDiagnostics(loadedSources.sourcePolicyDecision),
    git: {
      commit_sha: fingerprint.commitSha,
      status_hash: fingerprint.statusHash,
      dirty: fingerprint.dirty
    }
  }
}

export async function writeReviewerTestEvidenceArtifact(
  artifactPath: string,
  artifact: ReviewerTestEvidenceArtifact
): Promise<void> {
  await mkdir(dirname(artifactPath), { recursive: true })
  await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, {
    encoding: "utf8"
  })
}

export async function readReviewerTestEvidenceArtifact(
  artifactPath: string
): Promise<ReviewerTestEvidenceArtifact | undefined> {
  const raw = await readFile(artifactPath, "utf8").catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") {
      return undefined
    }
    throw error
  })
  if (raw === undefined) {
    return undefined
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw) as unknown
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      return undefined
    }
    throw error
  }
  if (!isRecord(parsed)) {
    return undefined
  }

  if (parsed.schema_version !== reviewerTestEvidenceSchemaVersion) {
    return undefined
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
  ]
  for (const key of required) {
    if (!(key in parsed)) {
      return undefined
    }
  }

  return parsed as unknown as ReviewerTestEvidenceArtifact
}

function compareFingerprint(
  artifact: ReviewerTestEvidenceArtifact,
  current: WorktreeFingerprint
): { stale: boolean; detail: string } {
  if (!current.ok) {
    return {
      stale: true,
      detail: "Cannot resolve current git fingerprint; evidence freshness cannot be confirmed."
    }
  }

  if (artifact.git.commit_sha !== current.commitSha) {
    return {
      stale: true,
      detail: `Commit changed after verification (${artifact.git.commit_sha ?? "unknown"} -> ${current.commitSha ?? "unknown"}).`
    }
  }

  if (artifact.git.status_hash !== current.statusHash) {
    return {
      stale: true,
      detail: "Worktree status changed after verification; prior evidence is stale."
    }
  }

  return {
    stale: false,
    detail: "Evidence fingerprint matches current worktree state."
  }
}

function isDocsOnlyCompatibilityArtifact(artifact: ReviewerTestEvidenceArtifact): boolean {
  const reasonDetail = artifact.reason_detail.trim()
  const hasDocsOnlyDiscriminator =
    /(?:docs-only|document-only)\s+scope/iu.test(reasonDetail)

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
  )
}

export async function resolveReviewerTestExecutionDirective(
  input: ResolveReviewerTestExecutionDirectiveInput
): Promise<ReviewerTestExecutionDirective> {
  let artifact: ReviewerTestEvidenceArtifact | undefined
  try {
    artifact = await readReviewerTestEvidenceArtifact(input.artifactPath)
  } catch (error: unknown) {
    if (input.reviewArtifactType === "document") {
      return createDocsOnlySkipDirective()
    }

    const readFailureDetail =
      error instanceof Error && error.message.trim().length > 0
        ? `Reviewer test verification artifact read failed: ${error.message}`
        : "Reviewer test verification artifact read failed."
    return {
      skip_full_rerun: false,
      reason_code: "evidence_unverifiable",
      reason_detail: summarizeReason("evidence_unverifiable", readFailureDetail),
      verification_status: "untrusted"
    }
  }

  if (artifact === undefined) {
    if (input.reviewArtifactType === "document") {
      return createDocsOnlySkipDirective()
    }

    return {
      skip_full_rerun: false,
      reason_code: "evidence_missing",
      reason_detail: summarizeReason(
        "evidence_missing",
        "No reviewer test verification artifact found for the latest implementer handoff."
      ),
      verification_status: "missing"
    }
  }

  return resolveReviewerTestExecutionDirectiveFromArtifact({
    artifact,
    worktreePath: input.worktreePath,
    ...(input.reviewArtifactType !== undefined
      ? { reviewArtifactType: input.reviewArtifactType }
      : {})
  })
}

export async function resolveReviewerTestExecutionDirectiveFromArtifact(input: {
  artifact: ReviewerTestEvidenceArtifact;
  worktreePath: string;
  reviewArtifactType?: ReviewArtifactType;
}): Promise<ReviewerTestExecutionDirective> {
  if (input.artifact.status !== "trusted") {
    if (input.reviewArtifactType === "document") {
      return createDocsOnlySkipDirective(
        input.artifact.reason_detail.trim().length > 0
          ? input.artifact.reason_detail
          : docsOnlyRuntimeChecksNotRequiredDetail
      )
    }

    return {
      skip_full_rerun: false,
      reason_code: input.artifact.reason_code,
      reason_detail: summarizeReason(input.artifact.reason_code, input.artifact.reason_detail),
      verification_status: "untrusted"
    }
  }

  const docsOnlyCompatibilityMatch =
    input.reviewArtifactType === undefined &&
    isDocsOnlyCompatibilityArtifact(input.artifact)
  if (input.reviewArtifactType === "document" || docsOnlyCompatibilityMatch) {
    return createDocsOnlySkipDirective(
      input.artifact.reason_detail.trim().length > 0
        ? input.artifact.reason_detail
        : docsOnlyRuntimeChecksNotRequiredDetail
    )
  }

  const current = await readWorktreeFingerprint(input.worktreePath)
  const freshness = compareFingerprint(input.artifact, current)
  if (freshness.stale) {
    return {
      skip_full_rerun: false,
      reason_code: "evidence_stale",
      reason_detail: summarizeReason("evidence_stale", freshness.detail),
      verification_status: "untrusted"
    }
  }

  return {
    skip_full_rerun: true,
    reason_code: "no_trigger",
    reason_detail: summarizeReason("no_trigger", input.artifact.reason_detail),
    verification_status: "trusted"
  }
}

export function buildReviewerDecisionMatrixReminder(): string {
  return [
    "Decision matrix triggers that still require tests:",
    "evidence missing/unverifiable/stale,",
    "reviewer-requested scope changes,",
    "high-risk domains (concurrency/persistence/auth/security/destructive flows),",
    "or flaky/infra uncertainty."
  ].join(" ")
}

export function formatReviewerTestExecutionDirective(
  directive: ReviewerTestExecutionDirective
): string {
  if (directive.skip_full_rerun) {
    return [
      "Implementer test evidence has been orchestrator-verified. Do not re-run full tests unless a trigger from the decision matrix applies.",
      buildReviewerDecisionMatrixReminder(),
      `Reason: ${directive.reason_detail}`
    ].join(" ")
  }

  return [
    `Run required checks before final judgment (reason code: ${directive.reason_code}).`,
    `Reason: ${directive.reason_detail}`,
    buildReviewerDecisionMatrixReminder()
  ].join(" ")
}
