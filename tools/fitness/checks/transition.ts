import { readFile } from "node:fs/promises";
import { relative } from "node:path";

import { normalizePathToPosix, resolveFilesForScopePatterns } from "../scope.js";
import type { FitnessPolicyCheck, FitnessReportCheck } from "../types.js";

interface TransitionViolation {
  path: string;
  line: number;
  severity: "fail" | "warn";
  kind: "persist_without_validation" | "manual_next_state_candidate";
  snippet: string;
}

const persistCallPattern = /\bwriteStateSnapshot\s*\(/u;

const transitionValidationMarkerPatterns: readonly RegExp[] = [
  /\bapplyStateTransition\s*\(/u,
  /\bStateTransitionService\b/u,
  /\bvalidated_next_state\b/u,
  /\bvalidatedNextState\b/u
] as const;

const stateSpreadPattern = /\.\.\.\s*(?:state|currentState)\b/u;
const sensitiveStateFieldPattern =
  /\b(?:state|round|active_agent|active_role|active_since|last_command_at)\s*:/u;

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

function collectPersistValidationViolations(
  filePath: string,
  lines: readonly string[]
): TransitionViolation[] {
  const violations: TransitionViolation[] = [];
  const persistLines = collectLineNumbers(lines, persistCallPattern);
  const validationMarkerLines = transitionValidationMarkerPatterns.flatMap((pattern) =>
    collectLineNumbers(lines, pattern)
  );
  for (const persistLine of persistLines) {
    const hasPriorValidationMarker = validationMarkerLines.some(
      (markerLine) => markerLine < persistLine
    );
    if (hasPriorValidationMarker) {
      continue;
    }
    const snippet = (lines[persistLine - 1] ?? "").trim();
    violations.push({
      path: filePath,
      line: persistLine,
      severity: "fail",
      kind: "persist_without_validation",
      snippet
    });
  }
  return violations;
}

function collectManualNextStateCandidates(
  filePath: string,
  lines: readonly string[]
): TransitionViolation[] {
  const warnings: TransitionViolation[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (!stateSpreadPattern.test(line)) {
      continue;
    }
    const windowEnd = Math.min(index + 12, lines.length - 1);
    let hasSensitiveFieldMutation = false;
    for (let cursor = index; cursor <= windowEnd; cursor += 1) {
      const candidate = lines[cursor] ?? "";
      if (sensitiveStateFieldPattern.test(candidate)) {
        hasSensitiveFieldMutation = true;
        break;
      }
    }
    if (!hasSensitiveFieldMutation) {
      continue;
    }
    warnings.push({
      path: filePath,
      line: index + 1,
      severity: "warn",
      kind: "manual_next_state_candidate",
      snippet: line.trim()
    });
  }
  return warnings;
}

function collectTransitionViolations(
  filePath: string,
  fileContent: string
): TransitionViolation[] {
  const lines = fileContent.split(/\r?\n/u);
  return [
    ...collectPersistValidationViolations(filePath, lines),
    ...collectManualNextStateCandidates(filePath, lines)
  ];
}

function summarizeTransitionViolations(
  violations: readonly TransitionViolation[]
): string[] {
  return violations.slice(0, 50).map((violation) => {
    const violationLabel =
      violation.kind === "persist_without_validation"
        ? "persist without transition validation"
        : "manual next-state candidate";
    return `${violation.path}:${violation.line} [${violation.severity}] ${violationLabel} -> ${violation.snippet}`;
  });
}

export async function buildTransitionCheckReport({
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
      summary: "Transition check has no configured scope.",
      metric: check.metric,
      details: ["Set scope patterns in tools/fitness/policy.json for transition check."]
    };
  }

  const files = await resolveFilesForScopePatterns(repoRoot, scope);
  if (files.length === 0) {
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "pass",
      summary: "Transition check passed: no files matched current scope.",
      metric: check.metric,
      details: [`scope=${scope.join(", ")}`]
    };
  }

  const allViolations: TransitionViolation[] = [];
  for (const absolutePath of files) {
    const raw = await readFile(absolutePath, "utf8");
    const relativePath = normalizePathToPosix(relative(repoRoot, absolutePath));
    allViolations.push(...collectTransitionViolations(relativePath, raw));
  }

  const failCount = allViolations.filter((violation) => violation.severity === "fail").length;
  const warnCount = allViolations.filter((violation) => violation.severity === "warn").length;
  if (failCount === 0 && warnCount === 0) {
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "pass",
      summary: `Transition check passed: ${files.length} scoped files scanned, no validation-order issues detected.`,
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
      summary: `Transition check failed: ${String(failCount)} persist-before-validation violation(s) (${String(warnCount)} warning candidate(s)).`,
      metric: check.metric,
      details: summarizeTransitionViolations(allViolations)
    };
  }

  return {
    id: check.id,
    owner: check.owner ?? "unknown",
    mode,
    status: "warn",
    summary: `Transition check warning: ${String(warnCount)} manual next-state candidate(s) detected.`,
    metric: check.metric,
    details: summarizeTransitionViolations(allViolations)
  };
}
