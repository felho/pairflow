import { readFile } from "node:fs/promises";
import { relative } from "node:path";

import { normalizePathToPosix, resolveFilesForScopePatterns } from "../scope.js";
import type { FitnessPolicyCheck, FitnessReportCheck } from "../types.js";

interface MutationViolation {
  path: string;
  line: number;
  severity: "fail" | "warn";
  kind: "state_before_transcript" | "state_without_transcript";
  snippet: string;
}

const persistCallPattern = /\bwriteStateSnapshot\s*\(/u;
const transcriptAppendPattern = /\bappendProtocolEnvelope\s*\(/u;

function collectLineNumbers(lines: readonly string[], pattern: RegExp): number[] {
  const matches: number[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (pattern.test(line)) {
      matches.push(index + 1);
    }
  }
  return matches;
}

function collectMutationViolations(
  filePath: string,
  fileContent: string
): MutationViolation[] {
  const lines = fileContent.split(/\r?\n/u);
  const persistLines = collectLineNumbers(lines, persistCallPattern);
  const appendLines = collectLineNumbers(lines, transcriptAppendPattern);
  const violations: MutationViolation[] = [];

  if (persistLines.length === 0) {
    return violations;
  }
  if (appendLines.length === 0) {
    for (const line of persistLines) {
      violations.push({
        path: filePath,
        line,
        severity: "warn",
        kind: "state_without_transcript",
        snippet: (lines[line - 1] ?? "").trim()
      });
    }
    return violations;
  }

  for (const persistLine of persistLines) {
    const hasPriorAppend = appendLines.some((appendLine) => appendLine < persistLine);
    if (hasPriorAppend) {
      continue;
    }
    violations.push({
      path: filePath,
      line: persistLine,
      severity: "fail",
      kind: "state_before_transcript",
      snippet: (lines[persistLine - 1] ?? "").trim()
    });
  }
  return violations;
}

function summarizeMutationViolations(violations: readonly MutationViolation[]): string[] {
  return violations.slice(0, 50).map((violation) => {
    const label =
      violation.kind === "state_before_transcript"
        ? "state persist before transcript append"
        : "state persist without transcript append evidence";
    return `${violation.path}:${violation.line} [${violation.severity}] ${label} -> ${violation.snippet}`;
  });
}

export async function buildMutationCheckReport({
  check,
  repoRoot,
  fallbackMode
}: {
  check: FitnessPolicyCheck;
  repoRoot: string;
  fallbackMode: string;
}): Promise<FitnessReportCheck> {
  const mode = check.mode ?? fallbackMode;
  const scope = check.scope ?? [];
  if (scope.length === 0) {
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "warn",
      summary: "Mutation check has no configured scope.",
      metric: check.metric,
      details: ["Set scope patterns in tools/fitness/policy.json for mutation check."]
    };
  }

  const files = await resolveFilesForScopePatterns(repoRoot, scope);
  if (files.length === 0) {
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "pass",
      summary: "Mutation check passed: no files matched current scope.",
      metric: check.metric,
      details: [`scope=${scope.join(", ")}`]
    };
  }

  const violations: MutationViolation[] = [];
  for (const absolutePath of files) {
    const raw = await readFile(absolutePath, "utf8");
    const relativePath = normalizePathToPosix(relative(repoRoot, absolutePath));
    violations.push(...collectMutationViolations(relativePath, raw));
  }

  const failCount = violations.filter((violation) => violation.severity === "fail").length;
  const warnCount = violations.filter((violation) => violation.severity === "warn").length;

  if (failCount === 0 && warnCount === 0) {
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "pass",
      summary: `Mutation check passed: ${files.length} scoped files scanned, transcript-first ordering preserved.`,
      metric: check.metric,
      details: [`scope=${scope.join(", ")}`, `files_scanned=${String(files.length)}`]
    };
  }

  if (failCount > 0) {
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "fail",
      summary: `Mutation check failed: ${String(failCount)} transcript-order violation(s) (${String(warnCount)} warning candidate(s)).`,
      metric: check.metric,
      details: summarizeMutationViolations(violations)
    };
  }

  return {
    id: check.id,
    owner: check.owner ?? "unknown",
    mode,
    status: "warn",
    summary: `Mutation check warning: ${String(warnCount)} state-persist-without-transcript candidate(s).`,
    metric: check.metric,
    details: summarizeMutationViolations(violations)
  };
}
