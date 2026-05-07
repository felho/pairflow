import { readFile } from "node:fs/promises";
import { relative } from "node:path";

import { normalizePathToPosix, resolveFilesForScopePatterns } from "../scope.js";
import type {
  FitnessPolicyCheck,
  FitnessPolicyException,
  FitnessReportCheck
} from "../types.js";

interface BoundaryViolation {
  path: string;
  line: number;
  kind: "state_write" | "transcript_write";
  snippet: string;
}

interface MutationExecutorException {
  id: string;
  paths: string[];
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

function normalizeRelativePolicyPath(inputPath: string, repoRoot: string): string {
  const normalizedInput = normalizePathToPosix(inputPath).replace(/^\.\//u, "");
  if (normalizedInput.startsWith("/")) {
    return normalizePathToPosix(relative(repoRoot, normalizedInput));
  }
  return normalizedInput;
}

function parseBoundaryExceptions(input: {
  repoRoot: string;
  exceptions: readonly FitnessPolicyException[] | undefined;
}): {
  mutationExecutors: MutationExecutorException[];
  invalid: string[];
} {
  const mutationExecutors: MutationExecutorException[] = [];
  const invalid: string[] = [];

  for (const exception of input.exceptions ?? []) {
    if (exception.kind !== "mutation_executor") {
      invalid.push(
        `exception ${exception.id}: unsupported boundary exception kind "${exception.kind}"`
      );
      continue;
    }
    if (exception.paths === undefined || exception.paths.length === 0) {
      invalid.push(
        `exception ${exception.id}: mutation_executor requires non-empty paths field`
      );
      continue;
    }
    mutationExecutors.push({
      id: exception.id,
      paths: exception.paths.map((path) =>
        normalizeRelativePolicyPath(path, input.repoRoot)
      )
    });
  }

  return { mutationExecutors, invalid };
}

function isApplicationMutationExecutionBoundary(filePath: string): boolean {
  return /^src\/v11\/application\/[^/]+\/mutation\/.+\.ts$/u.test(
    filePath
  );
}

function findMutationExecutorException(
  filePath: string,
  exceptions: readonly MutationExecutorException[]
): MutationExecutorException | undefined {
  return exceptions.find((exception) => exception.paths.includes(filePath));
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
  const parsedExceptions = parseBoundaryExceptions({
    repoRoot,
    exceptions: check.exceptions
  });
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
  let conventionMutationExecutionFiles = 0;
  let exceptionMutationExecutionFiles = 0;
  const appliedExceptionIds = new Set<string>();
  for (const absolutePath of files) {
    const relativePath = normalizePathToPosix(relative(repoRoot, absolutePath));
    if (isApplicationMutationExecutionBoundary(relativePath)) {
      conventionMutationExecutionFiles += 1;
      continue;
    }
    const exception = findMutationExecutorException(
      relativePath,
      parsedExceptions.mutationExecutors
    );
    if (exception !== undefined) {
      exceptionMutationExecutionFiles += 1;
      appliedExceptionIds.add(exception.id);
      continue;
    }
    const raw = await readFile(absolutePath, "utf8");
    allViolations.push(...collectBoundaryViolations(relativePath, raw));
  }

  const scanDetails = [
    `scope=${scope.join(", ")}`,
    `files_scanned=${String(files.length)}`,
    `mutation_execution_convention_files=${String(conventionMutationExecutionFiles)}`,
    `mutation_execution_exception_files=${String(exceptionMutationExecutionFiles)}`,
    `mutation_executor_exceptions_configured=${String(parsedExceptions.mutationExecutors.length)}`,
    `mutation_executor_exceptions_applied=${String(appliedExceptionIds.size)}`
  ];
  if (parsedExceptions.invalid.length > 0) {
    scanDetails.push(`exceptions_invalid=${String(parsedExceptions.invalid.length)}`);
    scanDetails.push(...parsedExceptions.invalid.slice(0, 10));
  }
  if (appliedExceptionIds.size > 0) {
    scanDetails.push(
      `mutation_executor_exceptions_applied_ids=${[...appliedExceptionIds]
        .sort((left, right) => left.localeCompare(right))
        .join(", ")}`
    );
  }

  if (allViolations.length === 0 && parsedExceptions.invalid.length === 0) {
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "pass",
      summary: `Boundary check passed: ${files.length} scoped files scanned, no direct write violations.`,
      metric: check.metric,
      details: scanDetails
    };
  }

  return {
    id: check.id,
    owner: check.owner ?? "unknown",
    mode,
    status: "fail",
    summary: `Boundary check failed: ${String(allViolations.length)} direct write violation(s) and ${String(parsedExceptions.invalid.length)} invalid exception(s) in ${String(files.length)} scoped files.`,
    metric: check.metric,
    details: [
      ...summarizeBoundaryViolations(allViolations),
      "Legitimate mutation executors should live under src/v11/application/<command>/mutation/** or be registered with a mutation_executor exception.",
      ...scanDetails
    ]
  };
}
