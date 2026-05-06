import { readFile } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";

import ts from "typescript";

import { normalizePathToPosix, resolveFilesForScopePatterns } from "../scope.js";
import type {
  FitnessPolicyCheck,
  FitnessPolicyException,
  FitnessReportCheck
} from "../types.js";

interface ImportSpecifier {
  specifier: string;
  line: number;
}

interface InternalImportViolation {
  fromRelative: string;
  toRelative: string;
  ownerRoot: string;
  line: number;
}

interface InternalImportException {
  id: string;
  from: string;
  to: string;
}

function normalizeRelativePolicyPath(
  inputPath: string,
  repoRoot: string
): string {
  const normalizedInput = normalizePathToPosix(inputPath).replace(/^\.\//u, "");
  if (normalizedInput.startsWith("/")) {
    return normalizePathToPosix(relative(repoRoot, normalizedInput));
  }
  return normalizedInput;
}

function parseImportExceptions(input: {
  repoRoot: string;
  exceptions: readonly FitnessPolicyException[] | undefined;
}): {
  allowlist: InternalImportException[];
  invalid: string[];
} {
  const allowlist: InternalImportException[] = [];
  const invalid: string[] = [];

  for (const exception of input.exceptions ?? []) {
    if (exception.kind !== "allow-internal-module-import") {
      invalid.push(
        `exception ${exception.id}: unsupported internal_module_boundary exception kind "${exception.kind}"`
      );
      continue;
    }
    if (exception.from === undefined || exception.to === undefined) {
      invalid.push(
        `exception ${exception.id}: allow-internal-module-import requires from/to fields`
      );
      continue;
    }
    allowlist.push({
      id: exception.id,
      from: normalizeRelativePolicyPath(exception.from, input.repoRoot),
      to: normalizeRelativePolicyPath(exception.to, input.repoRoot)
    });
  }

  return { allowlist, invalid };
}

function parseImportSpecifiers(input: {
  filePath: string;
  sourceText: string;
}): ImportSpecifier[] {
  const sourceFile = ts.createSourceFile(
    input.filePath,
    input.sourceText,
    ts.ScriptTarget.Latest,
    true
  );
  const imports: ImportSpecifier[] = [];

  const pushSpecifier = (specifier: string, node: ts.Node): void => {
    const line =
      sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
    imports.push({ specifier, line });
  };

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      pushSpecifier(node.moduleSpecifier.text, node.moduleSpecifier);
    } else if (
      ts.isExportDeclaration(node)
      && node.moduleSpecifier !== undefined
      && ts.isStringLiteral(node.moduleSpecifier)
    ) {
      pushSpecifier(node.moduleSpecifier.text, node.moduleSpecifier);
    } else if (
      ts.isCallExpression(node)
      && node.expression.kind === ts.SyntaxKind.ImportKeyword
      && node.arguments.length === 1
    ) {
      const argument = node.arguments[0];
      if (argument !== undefined && ts.isStringLiteral(argument)) {
        pushSpecifier(argument.text, argument);
      }
    }
    node.forEachChild(visit);
  };

  visit(sourceFile);
  return imports;
}

function resolveRelativeImportTarget(input: {
  importerPath: string;
  specifier: string;
  knownFiles: ReadonlySet<string>;
}): string | undefined {
  if (!input.specifier.startsWith(".")) {
    return undefined;
  }

  const importerDir = dirname(input.importerPath);
  const rawTarget = resolve(importerDir, input.specifier);
  const rawExt = extname(rawTarget);
  const candidates = new Set<string>([rawTarget]);

  if (rawExt === ".js" || rawExt === ".mjs" || rawExt === ".cjs") {
    candidates.add(rawTarget.slice(0, -rawExt.length) + ".ts");
    candidates.add(rawTarget.slice(0, -rawExt.length) + ".tsx");
  } else if (rawExt.length === 0) {
    candidates.add(`${rawTarget}.ts`);
    candidates.add(`${rawTarget}.tsx`);
    candidates.add(resolve(rawTarget, "index.ts"));
    candidates.add(resolve(rawTarget, "index.tsx"));
  }

  for (const candidate of candidates) {
    if (input.knownFiles.has(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

function resolveInternalOwnerRoot(relativePath: string): string | undefined {
  const segments = normalizePathToPosix(relativePath).split("/");
  const internalIndex = segments.indexOf("internal");
  if (internalIndex <= 0) {
    return undefined;
  }
  return segments.slice(0, internalIndex).join("/");
}

function isWithinOwnerRoot(input: {
  fromRelative: string;
  ownerRoot: string;
}): boolean {
  return (
    input.fromRelative === input.ownerRoot
    || input.fromRelative.startsWith(`${input.ownerRoot}/`)
  );
}

function isOwnerRootIndex(input: {
  fromRelative: string;
  ownerRoot: string;
}): boolean {
  return input.fromRelative === `${input.ownerRoot}/index.ts`;
}

function filterViolationsByExceptions(input: {
  violations: readonly InternalImportViolation[];
  allowlist: readonly InternalImportException[];
}): {
  violations: InternalImportViolation[];
  appliedExceptionIds: string[];
} {
  const appliedExceptionIds = new Set<string>();
  const violations: InternalImportViolation[] = [];

  for (const violation of input.violations) {
    const match = input.allowlist.find(
      (exception) =>
        exception.from === violation.fromRelative
        && exception.to === violation.toRelative
    );
    if (match !== undefined) {
      appliedExceptionIds.add(match.id);
      continue;
    }
    violations.push(violation);
  }

  return {
    violations,
    appliedExceptionIds: [...appliedExceptionIds].sort((left, right) =>
      left.localeCompare(right)
    )
  };
}

async function collectViolations(input: {
  repoRoot: string;
  files: readonly string[];
}): Promise<InternalImportViolation[]> {
  const knownFiles = new Set(input.files);
  const violations: InternalImportViolation[] = [];

  for (const filePath of input.files) {
    const fromRelative = normalizePathToPosix(relative(input.repoRoot, filePath));
    const sourceText = await readFile(filePath, "utf8");
    const imports = parseImportSpecifiers({ filePath, sourceText });
    for (const imported of imports) {
      const target = resolveRelativeImportTarget({
        importerPath: filePath,
        specifier: imported.specifier,
        knownFiles
      });
      if (target === undefined) {
        continue;
      }
      const toRelative = normalizePathToPosix(relative(input.repoRoot, target));
      const ownerRoot = resolveInternalOwnerRoot(toRelative);
      if (ownerRoot === undefined) {
        continue;
      }
      if (isOwnerRootIndex({ fromRelative, ownerRoot })) {
        violations.push({
          fromRelative,
          toRelative,
          ownerRoot,
          line: imported.line
        });
        continue;
      }
      if (isWithinOwnerRoot({ fromRelative, ownerRoot })) {
        continue;
      }
      violations.push({
        fromRelative,
        toRelative,
        ownerRoot,
        line: imported.line
      });
    }
  }

  return violations.sort((left, right) => {
    const fileCompare = left.fromRelative.localeCompare(right.fromRelative);
    return fileCompare === 0 ? left.line - right.line : fileCompare;
  });
}

export async function buildInternalModuleBoundaryCheckReport({
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
  const parsedExceptions = parseImportExceptions({
    repoRoot,
    exceptions: check.exceptions
  });

  if (scope.length === 0) {
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: mode === "hard-fail" ? "fail" : "warn",
      summary: "Internal module boundary check has no configured scope.",
      metric: check.metric,
      details: [
        "Set scope patterns in tools/fitness/policy.json for internal_module_boundary check."
      ]
    };
  }

  const files = await resolveFilesForScopePatterns(repoRoot, scope);
  const allViolations = await collectViolations({ repoRoot, files });
  const filtered = filterViolationsByExceptions({
    violations: allViolations,
    allowlist: parsedExceptions.allowlist
  });
  const details = [
    ...filtered.violations.slice(0, 100).map(
      (violation) =>
        `${violation.fromRelative}:${String(violation.line)} imports private internal module ${violation.toRelative}; owner_root=${violation.ownerRoot}`
    ),
    filtered.violations.length > 100
      ? `violations_truncated=${String(filtered.violations.length - 100)}`
      : undefined,
    `scope=${scope.join(", ")}`,
    `files_scanned=${String(files.length)}`,
    `exceptions_configured=${String(check.exceptions?.length ?? 0)}`,
    `exceptions_applied=${String(filtered.appliedExceptionIds.length)}`
  ].filter((detail) => detail !== undefined);

  if (parsedExceptions.invalid.length > 0) {
    details.push(`exceptions_invalid=${String(parsedExceptions.invalid.length)}`);
    details.push(...parsedExceptions.invalid.slice(0, 10));
  }
  if (filtered.appliedExceptionIds.length > 0) {
    details.push(
      `exceptions_applied_ids=${filtered.appliedExceptionIds.join(", ")}`
    );
  }

  const problemCount = filtered.violations.length + parsedExceptions.invalid.length;
  if (problemCount > 0) {
    const violationSummary =
      filtered.violations.length > 0
        ? `${String(filtered.violations.length)} external internal-module import(s)`
        : undefined;
    const invalidSummary =
      parsedExceptions.invalid.length > 0
        ? `${String(parsedExceptions.invalid.length)} invalid exception entr${parsedExceptions.invalid.length === 1 ? "y" : "ies"}`
        : undefined;
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: mode === "hard-fail" ? "fail" : "warn",
      summary: `Internal module boundary check ${mode === "hard-fail" ? "failed" : "warning"}: ${[violationSummary, invalidSummary].filter((item) => item !== undefined).join(" and ")} detected.`,
      metric: check.metric,
      details
    };
  }

  return {
    id: check.id,
    owner: check.owner ?? "unknown",
    mode,
    status: "pass",
    summary: `Internal module boundary check passed: ${String(files.length)} scoped file(s) scanned, no external /internal/ imports.`,
    metric: check.metric,
    details
  };
}
