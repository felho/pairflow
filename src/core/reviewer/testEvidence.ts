import { createHash } from "node:crypto"
import { mkdir, readFile, realpath, writeFile } from "node:fs/promises"
import { dirname, isAbsolute, join, relative, resolve } from "node:path"

import { runGit } from "../workspace/git.js"
import type { BubbleConfig } from "../../types/bubble.js"
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

const maxRefSourceChars = 60_000

function isPathInside(parentPath: string, childPath: string): boolean {
  const rel = relative(resolve(parentPath), resolve(childPath))
  return rel === "" || !rel.startsWith("..")
}

function isAllowedRefPath(path: string, worktreePath: string, repoPath: string): boolean {
  return isPathInside(worktreePath, path) || isPathInside(repoPath, path)
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

function resolveRefPath(ref: string, worktreePath: string, repoPath: string): string[] {
  const trimmed = ref.trim()
  if (trimmed.length === 0) {
    return []
  }

  if (trimmed.includes("://")) {
    return []
  }

  const hashIndex = trimmed.indexOf("#")
  const withoutFragment = hashIndex >= 0 ? trimmed.slice(0, hashIndex) : trimmed
  if (withoutFragment.length === 0) {
    return []
  }

  if (isAbsolute(withoutFragment)) {
    const absolutePath = resolve(withoutFragment)
    return isAllowedRefPath(absolutePath, worktreePath, repoPath) ? [absolutePath] : []
  }

  const resolvedFromWorktree = resolve(worktreePath, withoutFragment)
  const resolvedFromRepo = resolve(repoPath, withoutFragment)
  const candidates = resolvedFromWorktree === resolvedFromRepo
    ? [resolvedFromWorktree]
    : [resolvedFromWorktree, resolvedFromRepo]
  return candidates.filter((candidate) =>
    isAllowedRefPath(candidate, worktreePath, repoPath)
  )
}

async function loadEvidenceSources(input: {
  summary: string;
  refs: string[];
  worktreePath: string;
  repoPath: string;
}): Promise<EvidenceSource[]> {
  const sources: EvidenceSource[] = []
  const summary = input.summary.trim()
  if (summary.length > 0) {
    sources.push({
      kind: "summary",
      id: "pass.summary",
      text: summary
    })
  }

  const canonicalWorktreePath = await realpath(input.worktreePath).catch(() =>
    resolve(input.worktreePath)
  )
  const canonicalRepoPath = await realpath(input.repoPath).catch(() =>
    resolve(input.repoPath)
  )

  const seenRefIds = new Set<string>()
  for (const ref of input.refs) {
    const candidates = resolveRefPath(ref, input.worktreePath, input.repoPath)
    for (const path of candidates) {
      const canonicalPath = await realpath(path).catch(() => undefined)
      if (canonicalPath === undefined) {
        continue
      }

      if (
        !isPathInside(canonicalWorktreePath, canonicalPath) &&
        !isPathInside(canonicalRepoPath, canonicalPath)
      ) {
        continue
      }

      if (seenRefIds.has(canonicalPath)) {
        continue
      }

      const content = await readFile(canonicalPath, "utf8").catch(() => undefined)
      if (content === undefined) {
        continue
      }

      seenRefIds.add(canonicalPath)
      sources.push({
        kind: "ref",
        id: canonicalPath,
        text: content.slice(0, maxRefSourceChars)
      })
      break
    }
  }

  return sources
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

function classifyEvidence(input: {
  commandEvidence: ReviewerTestCommandEvidence[];
  requiredCommands: string[];
  fingerprintOk: boolean;
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
      reasonDetail: "Bubble config does not define required test/typecheck commands."
    }
  }

  if (!input.fingerprintOk) {
    return {
      status: "untrusted",
      decision: "run_checks",
      reasonCode: "evidence_unverifiable",
      reasonDetail: "Could not bind evidence to a worktree fingerprint."
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
      reasonDetail: `Missing command evidence: ${missingCommands.join(", ")}.`
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
      reasonDetail: `Unverifiable command evidence: ${badCommands
        .map((entry) => `${entry.command} (${entry.status})`)
        .join(", ")}.`
    }
  }

  if (!hasTrustedProvenance(input.commandEvidence)) {
    return {
      status: "untrusted",
      decision: "run_checks",
      reasonCode: "evidence_unverifiable",
      reasonDetail:
        "Command provenance requirement not met: all required verified commands must be backed by execution log refs."
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
  const requiredCommands = normalizeRequiredCommands(input.bubbleConfig)
  const sources = await loadEvidenceSources({
    summary: input.envelope.payload.summary ?? "",
    refs: input.envelope.refs,
    worktreePath: input.worktreePath,
    repoPath: input.repoPath
  })
  const matchedCommandEvidence = requiredCommands.map((command) =>
    buildCommandEvidence(command, sources)
  )
  const commandEvidence = normalizeCommandEvidenceProvenance(matchedCommandEvidence)

  const fingerprint = await readWorktreeFingerprint(input.worktreePath)
  const classified = classifyEvidence({
    commandEvidence,
    requiredCommands,
    fingerprintOk: fingerprint.ok
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

export async function resolveReviewerTestExecutionDirective(
  input: ResolveReviewerTestExecutionDirectiveInput
): Promise<ReviewerTestExecutionDirective> {
  let artifact: ReviewerTestEvidenceArtifact | undefined
  try {
    artifact = await readReviewerTestEvidenceArtifact(input.artifactPath)
  } catch (error: unknown) {
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
    worktreePath: input.worktreePath
  })
}

export async function resolveReviewerTestExecutionDirectiveFromArtifact(input: {
  artifact: ReviewerTestEvidenceArtifact;
  worktreePath: string;
}): Promise<ReviewerTestExecutionDirective> {
  if (input.artifact.status !== "trusted") {
    return {
      skip_full_rerun: false,
      reason_code: input.artifact.reason_code,
      reason_detail: summarizeReason(input.artifact.reason_code, input.artifact.reason_detail),
      verification_status: "untrusted"
    }
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
