import { readFile } from "node:fs/promises";
import { relative } from "node:path";

import { normalizePathToPosix, resolveFilesForScopePatterns } from "../scope.js";
import type { FitnessPolicyCheck, FitnessReportCheck } from "../types.js";

interface ErrorViolation {
  path: string;
  line: number;
  severity: "fail";
  kind: "missing_code" | "missing_context";
  snippet: string;
}

const throwPattern = /\bthrow\b/u;
const bareRethrowPattern = /^\s*throw\s+[A-Za-z_$][\w$]*\s*;?\s*$/u;
const codeMarkers: readonly RegExp[] = [
  /\breason_code\b/u,
  /\breasonCode\b/u,
  /\bcode\s*:\s*["'`][A-Za-z0-9_:-]+["'`]/u,
  /\b[A-Z][A-Z0-9_]{2,}\b/u
] as const;

const contextMarkers: readonly RegExp[] = [
  /\bcontext\b/u,
  /\bbubble_id\b|\bbubbleId\b/u,
  /\bcommand_name\b|\bcommandName\b/u,
  /\boperation_id\b|\boperationId\b/u,
  /\bround\b/u
] as const;

function hasAnyPattern(text: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function collectErrorViolations(filePath: string, fileContent: string): ErrorViolation[] {
  const lines = fileContent.split(/\r?\n/u);
  const violations: ErrorViolation[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (!throwPattern.test(line)) {
      continue;
    }
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || bareRethrowPattern.test(trimmed)) {
      continue;
    }

    const windowStart = Math.max(0, index - 6);
    const windowEnd = Math.min(lines.length - 1, index + 6);
    const contextWindow = lines.slice(windowStart, windowEnd + 1).join("\n");
    const hasCode = hasAnyPattern(contextWindow, codeMarkers);
    const hasContext = hasAnyPattern(contextWindow, contextMarkers);

    if (!hasCode) {
      violations.push({
        path: filePath,
        line: index + 1,
        severity: "fail",
        kind: "missing_code",
        snippet: trimmed
      });
      continue;
    }

    if (!hasContext) {
      violations.push({
        path: filePath,
        line: index + 1,
        severity: "fail",
        kind: "missing_context",
        snippet: trimmed
      });
    }
  }
  return violations;
}

function summarizeErrorViolations(violations: readonly ErrorViolation[]): string[] {
  return violations.slice(0, 50).map((violation) => {
    const label =
      violation.kind === "missing_code"
        ? "missing stable error code near throw"
        : "missing required error context near throw";
    return `${violation.path}:${violation.line} [${violation.severity}] ${label} -> ${violation.snippet}`;
  });
}

export async function buildErrorCheckReport({
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
      summary: "Error check has no configured scope.",
      metric: check.metric,
      details: ["Set scope patterns in tools/fitness/policy.json for error check."]
    };
  }

  const files = await resolveFilesForScopePatterns(repoRoot, scope);
  if (files.length === 0) {
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "pass",
      summary: "Error check passed: no files matched current scope.",
      metric: check.metric,
      details: [`scope=${scope.join(", ")}`]
    };
  }

  const violations: ErrorViolation[] = [];
  for (const absolutePath of files) {
    const raw = await readFile(absolutePath, "utf8");
    const relativePath = normalizePathToPosix(relative(repoRoot, absolutePath));
    violations.push(...collectErrorViolations(relativePath, raw));
  }

  if (violations.length === 0) {
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "pass",
      summary: `Error check passed: ${files.length} scoped files scanned, code+context markers present on throw boundaries.`,
      metric: check.metric,
      details: [`scope=${scope.join(", ")}`, `files_scanned=${String(files.length)}`]
    };
  }

  return {
    id: check.id,
    owner: check.owner ?? "unknown",
    mode,
    status: "fail",
    summary: `Error check failed: ${String(violations.length)} throw boundary violation(s) missing code/context markers.`,
    metric: check.metric,
    details: summarizeErrorViolations(violations)
  };
}
