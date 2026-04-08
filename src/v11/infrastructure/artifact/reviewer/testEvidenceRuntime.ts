import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { runGit } from "../../../../core/workspace/git.js";
import { reviewerTestEvidenceSchemaVersion } from "../../../shared/reviewer/testEvidence.js";
import type {
  ReviewerTestCommandEvidence,
  ReviewerTestCommandStatus,
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
import type {
  EvidenceSource,
  EvidenceSourcePolicyDecision
} from "./testEvidenceSourcePolicy.js";

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

const docsOnlyRuntimeChecksNotRequiredDetail = "docs-only scope, runtime checks not required";

interface CommandAliasFamily {
  aliases: readonly string[];
}

const commandBoundaryCharClass = "\\p{L}\\p{N}_:/.@\\-";
const commandAliasFamiliesSeed: readonly CommandAliasFamily[] = [
  {
    aliases: ["pnpm typecheck", "pnpm run typecheck", "tsc --noEmit"]
  },
  {
    aliases: ["pnpm test", "pnpm run test", "vitest", "vitest run"]
  },
  {
    aliases: ["pnpm lint", "pnpm run lint", "eslint"]
  }
];
const commandAliasFamilies: readonly CommandAliasFamily[] = commandAliasFamiliesSeed.map(
  (family) => ({
    aliases: normalizeAliasFamily(family.aliases)
  })
);
const commandAliasLookup = new Map(
  commandAliasFamilies.flatMap((family) =>
    family.aliases.map((alias) => [alias, family.aliases] as const)
  )
);

function normalizeCommandText(command: string): string {
  return command.trim().toLowerCase().replace(/\s+/gu, " ");
}

function normalizeAliasFamily(aliases: readonly string[]): string[] {
  return [...new Set(aliases.map(normalizeCommandText))];
}

function resolveCommandMatchCandidates(command: string): string[] {
  const normalized = normalizeCommandText(command);
  const familyAliases = commandAliasLookup.get(normalized);
  if (familyAliases === undefined) {
    return [normalized];
  }
  return [...familyAliases].sort((left, right) => right.length - left.length);
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function buildCommandMatchRegex(commandPattern: string): RegExp {
  const commandBody = commandPattern
    .split(/\s+/u)
    .map((token) => escapeRegExp(token))
    .join("\\s+");
  return new RegExp(
    `(^|[^${commandBoundaryCharClass}])(${commandBody})(?=$|[^${commandBoundaryCharClass}])`,
    "giu"
  );
}

function normalizeRequiredCommands(config: VerifyImplementerTestEvidenceInput["bubbleConfig"]): string[] {
  const commands = [config.commands.typecheck, config.commands.test]
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  return [...new Set(commands)];
}

function hashText(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

async function readWorktreeFingerprint(worktreePath: string): Promise<WorktreeFingerprint> {
  const commit = await runGit(["rev-parse", "HEAD"], {
    cwd: worktreePath,
    allowFailure: true
  });
  const status = await runGit(["status", "--porcelain", "--untracked-files=all"], {
    cwd: worktreePath,
    allowFailure: true
  });

  if (commit.exitCode !== 0 || status.exitCode !== 0) {
    return {
      commitSha: null,
      statusHash: null,
      dirty: null,
      ok: false
    };
  }

  const statusRaw = status.stdout.replace(/\r\n/gu, "\n");
  return {
    commitSha: commit.stdout.trim(),
    statusHash: hashText(statusRaw),
    dirty: statusRaw.trim().length > 0,
    ok: true
  };
}

function findAllCommandMatches(commandPatterns: string[], sources: EvidenceSource[]): CommandMatch[] {
  const matches: CommandMatch[] = [];

  for (const source of sources) {
    const consumedMatchStarts = new Set<number>();
    for (const commandPattern of commandPatterns) {
      const matcher = buildCommandMatchRegex(commandPattern);
      for (const match of source.text.matchAll(matcher)) {
        const boundaryPrefix = match[1] ?? "";
        const matchedCommand = match[2] ?? commandPattern;
        const commandStart = (match.index ?? 0) + boundaryPrefix.length;
        if (consumedMatchStarts.has(commandStart)) {
          continue;
        }
        consumedMatchStarts.add(commandStart);
        const snippetStart = Math.max(0, commandStart - 220);
        const snippetEnd = Math.min(
          source.text.length,
          commandStart + matchedCommand.length + 220
        );
        const snippet = source.text.slice(snippetStart, snippetEnd);
        const snippetLower = snippet.toLowerCase();

        const explicitExitSuccess =
          /\b(?:exit(?:\s*code)?|command\s+exit(?:\s*code)?|process\s+exit(?:\s*code)?|returned)\s*[:=]?\s*0\b/iu.test(
            snippetLower
          );
        const explicitExitFailure =
          /\b(?:exit(?:\s*code)?|command\s+exit(?:\s*code)?|process\s+exit(?:\s*code)?|returned)\s*[:=]?\s*[1-9][0-9]*\b/iu.test(
            snippetLower
          ) ||
          /\b(?:found|with|had)\s+[1-9][0-9]*\s+errors?\b/iu.test(snippetLower) ||
          /\b(?:[1-9][0-9]*\s+failed(?:\s+tests?)?|tests?\s+failed|command\s+failed)\b/iu.test(
            snippetLower
          );

        const completionMarker =
          commandPattern.includes("typecheck") || commandPattern.includes("tsc")
            ? /\b(?:found\s+0\s+errors?|0\s+errors?|no\s+type\s+errors?|no\s+errors?|pass(?:ed)?|success(?:ful)?)\b/iu.test(
              snippetLower
            )
            : commandPattern.includes("test")
              ? /\b(?:\d+\s+tests?\b|test\s+files?\b|all\s+tests\s+passed|no\s+tests\s+failed|pass(?:ed)?)\b/iu.test(
                snippetLower
              )
              : /\b(?:pass(?:ed)?|success(?:ful)?|ok)\b/iu.test(snippetLower);

        const passToken = /\b(?:pass(?:ed)?|success(?:ful)?|ok)\b/iu.test(snippetLower);

        matches.push({
          source,
          snippet,
          explicitExitSuccess,
          explicitExitFailure,
          completionMarker,
          passToken
        });
      }
    }
  }

  return matches;
}

function scoreMatch(match: CommandMatch): number {
  let score = 0;
  if (match.explicitExitSuccess) {
    score += 3;
  }
  if (match.completionMarker) {
    score += 2;
  }
  if (match.passToken) {
    score += 1;
  }
  if (match.explicitExitFailure) {
    score -= 4;
  }
  if (match.source.kind === "ref") {
    score += 1;
  }
  return score;
}

function buildCommandEvidence(command: string, sources: EvidenceSource[]): ReviewerTestCommandEvidence {
  const commandLower = command.toLowerCase();
  const isTypecheckCommand = commandLower.includes("typecheck") || commandLower.includes("tsc");
  const matches = findAllCommandMatches(resolveCommandMatchCandidates(command), sources);
  if (matches.length === 0) {
    return {
      command,
      required: true,
      source: "none",
      status: "missing",
      exit_code: null,
      explicit_exit_status: false,
      completion_marker: false
    };
  }

  const bestMatch = [...matches].sort((left, right) => scoreMatch(right) - scoreMatch(left))[0];
  if (bestMatch === undefined) {
    return {
      command,
      required: true,
      source: "none",
      status: "missing",
      exit_code: null,
      explicit_exit_status: false,
      completion_marker: false
    };
  }

  let status: ReviewerTestCommandStatus = "unverifiable";
  let exitCode: 0 | 1 | null = null;
  if (bestMatch.explicitExitFailure) {
    status = "failed";
    exitCode = 1;
  } else if (
    bestMatch.completionMarker &&
    (bestMatch.explicitExitSuccess || bestMatch.passToken || isTypecheckCommand)
  ) {
    status = "verified";
    exitCode = 0;
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
  };
}

function hasTrustedProvenance(commandEvidence: ReviewerTestCommandEvidence[]): boolean {
  const verified = commandEvidence.filter((entry) => entry.status === "verified");
  if (verified.length === 0) {
    return false;
  }

  return verified.every((entry) => entry.source === "ref");
}

function normalizeCommandEvidenceProvenance(
  commandEvidence: ReviewerTestCommandEvidence[]
): ReviewerTestCommandEvidence[] {
  if (hasTrustedProvenance(commandEvidence)) {
    return commandEvidence;
  }

  return commandEvidence.map((entry) => {
    if (entry.status !== "verified" || entry.source !== "summary") {
      return entry;
    }
    return {
      ...entry,
      status: "unverifiable",
      exit_code: null
    };
  });
}

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

  if (!hasTrustedProvenance(input.commandEvidence)) {
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
