import { readFile } from "node:fs/promises";
import { relative } from "node:path";

import { normalizePathToPosix, resolveFilesForScopePatterns } from "../scope.js";
import type { FitnessPolicyCheck, FitnessReportCheck } from "../types.js";

interface BoundaryViolation {
  path: string;
  line: number;
  kind: "state_write" | "transcript_write";
  snippet: string;
}

const boundaryForbiddenPatterns: readonly {
  kind: BoundaryViolation["kind"];
  matcher: RegExp;
}[] = [
  {
    kind: "state_write",
    matcher: /\bwriteStateSnapshot\s*\(/u
  },
  {
    kind: "transcript_write",
    matcher: /\bappendProtocolEnvelope\s*\(/u
  }
] as const;

function collectBoundaryViolations(
  filePath: string,
  fileContent: string
): BoundaryViolation[] {
  const violations: BoundaryViolation[] = [];
  const lines = fileContent.split(/\r?\n/u);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();
    if (trimmed.startsWith("//")) {
      continue;
    }
    for (const pattern of boundaryForbiddenPatterns) {
      if (pattern.matcher.test(line)) {
        violations.push({
          path: filePath,
          line: index + 1,
          kind: pattern.kind,
          snippet: trimmed
        });
      }
    }
  }
  return violations;
}

function summarizeBoundaryViolations(violations: readonly BoundaryViolation[]): string[] {
  return violations.slice(0, 50).map((violation) => {
    const kindLabel =
      violation.kind === "state_write"
        ? "direct state write"
        : "direct transcript write";
    return `${violation.path}:${violation.line} ${kindLabel} -> ${violation.snippet}`;
  });
}

export async function buildBoundaryCheckReport({
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
      summary: "Boundary check has no configured scope.",
      metric: check.metric,
      details: ["Set scope patterns in tools/fitness/policy.json for boundary check."]
    };
  }

  const files = await resolveFilesForScopePatterns(repoRoot, scope);
  if (files.length === 0) {
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "pass",
      summary: "Boundary check passed: no files matched current scope.",
      metric: check.metric,
      details: [`scope=${scope.join(", ")}`]
    };
  }

  const allViolations: BoundaryViolation[] = [];
  for (const absolutePath of files) {
    const raw = await readFile(absolutePath, "utf8");
    const relativePath = normalizePathToPosix(relative(repoRoot, absolutePath));
    allViolations.push(...collectBoundaryViolations(relativePath, raw));
  }

  if (allViolations.length === 0) {
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "pass",
      summary: `Boundary check passed: ${files.length} scoped files scanned, no direct write violations.`,
      metric: check.metric,
      details: [`scope=${scope.join(", ")}`, `files_scanned=${String(files.length)}`]
    };
  }

  return {
    id: check.id,
    owner: check.owner ?? "unknown",
    mode,
    status: "fail",
    summary: `Boundary check failed: ${String(allViolations.length)} direct write violation(s) in ${String(files.length)} scoped files.`,
    metric: check.metric,
    details: summarizeBoundaryViolations(allViolations)
  };
}
