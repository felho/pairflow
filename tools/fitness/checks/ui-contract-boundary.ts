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

interface ImportViolation {
  fromRelative: string;
  target: string;
  line: number;
  reason: string;
}

interface ImportException {
  id: string;
  from: string;
  to: string;
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
  const staticModuleSpecifierText = (node: ts.Node): string | undefined => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      return node.text;
    }
    return undefined;
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
      && node.arguments.length >= 1
    ) {
      const argument = node.arguments[0];
      const specifier =
        argument === undefined ? undefined : staticModuleSpecifierText(argument);
      if (specifier !== undefined && argument !== undefined) {
        pushSpecifier(specifier, argument);
      }
    } else if (ts.isImportTypeNode(node)) {
      const argument = node.argument;
      if (
        ts.isLiteralTypeNode(argument)
        && ts.isStringLiteral(argument.literal)
      ) {
        pushSpecifier(argument.literal.text, argument.literal);
      }
    } else if (
      ts.isImportEqualsDeclaration(node)
      && ts.isExternalModuleReference(node.moduleReference)
      && ts.isStringLiteral(node.moduleReference.expression)
    ) {
      pushSpecifier(
        node.moduleReference.expression.text,
        node.moduleReference.expression
      );
    }
    node.forEachChild(visit);
  };

  visit(sourceFile);
  return imports;
}

function normalizePolicyPath(
  inputPath: string,
  repoRoot: string
): { path: string; error: string | undefined } {
  const normalizedInput = normalizePathToPosix(inputPath).replace(/^\.\//u, "");
  const normalizedPath = normalizedInput.startsWith("/")
    ? normalizePathToPosix(relative(repoRoot, normalizedInput))
    : normalizedInput;
  if (normalizedPath === ".." || normalizedPath.startsWith("../")) {
    return {
      path: normalizedPath,
      error: `path escapes repo root: ${inputPath}`
    };
  }
  if (normalizedPath.includes("/../")) {
    return {
      path: normalizedPath,
      error: `path must be normalized repo-relative: ${inputPath}`
    };
  }
  return { path: normalizedPath, error: undefined };
}

function parseImportExceptions(input: {
  repoRoot: string;
  exceptions: readonly FitnessPolicyException[] | undefined;
}): { allowlist: ImportException[]; invalid: string[] } {
  const allowlist: ImportException[] = [];
  const invalid: string[] = [];

  for (const exception of input.exceptions ?? []) {
    if (exception.kind !== "allow-import") {
      invalid.push(
        `exception ${exception.id}: unsupported ui_contract_boundary exception kind "${exception.kind}"`
      );
      continue;
    }
    if (exception.from === undefined || exception.to === undefined) {
      invalid.push(
        `exception ${exception.id}: allow-import requires from/to fields`
      );
      continue;
    }
    const from = normalizePolicyPath(exception.from, input.repoRoot);
    const to = normalizePolicyPath(exception.to, input.repoRoot);
    if (from.error !== undefined || to.error !== undefined) {
      invalid.push(
        [
          `exception ${exception.id}: allow-import path must stay within repo root`,
          from.error,
          to.error
        ]
          .filter((detail) => detail !== undefined)
          .join("; ")
      );
      continue;
    }
    allowlist.push({
      id: exception.id,
      from: from.path,
      to: to.path
    });
  }

  return { allowlist, invalid };
}

function resolveRelativeImportPath(input: {
  importerPath: string;
  specifier: string;
  repoRoot: string;
}): string | undefined {
  if (!input.specifier.startsWith(".")) {
    return undefined;
  }

  const importerDir = dirname(input.importerPath);
  const rawTarget = resolve(importerDir, input.specifier);
  const rawExt = extname(rawTarget);
  const target =
    rawExt === ".js" || rawExt === ".mjs" || rawExt === ".cjs"
      ? rawTarget.slice(0, -rawExt.length) + ".ts"
      : rawExt.length === 0
        ? `${rawTarget}.ts`
      : rawTarget;
  return normalizePathToPosix(relative(input.repoRoot, target));
}

function classifyTarget(input: {
  fromRelative: string;
  specifier: string;
  resolvedRelative: string | undefined;
}): string | undefined {
  const target = input.resolvedRelative ?? input.specifier;
  const normalizedTarget = normalizePathToPosix(target).replace(/^\.\//u, "");
  const fromUiContracts = input.fromRelative.startsWith("src/contracts/ui/");
  const fromUiSource = input.fromRelative.startsWith("ui/src/");

  if (fromUiSource && /^src\/v11(?:\/|$)/u.test(normalizedTarget)) {
    return "ui source must import browser-safe UI contracts through @pairflow/ui-contracts, not src/v11";
  }
  if (fromUiSource && input.specifier === "@pairflow/ui-contracts") {
    return undefined;
  }
  if (
    fromUiSource
    && /^src\/contracts\/ui(?:\/|$)/u.test(normalizedTarget)
  ) {
    return "ui source must import canonical UI contracts through @pairflow/ui-contracts, not relative src/contracts/ui paths";
  }
  if (fromUiSource && /^src\/types(?:\/|$)/u.test(normalizedTarget)) {
    return "ui source must import browser-safe UI contracts through @pairflow/ui-contracts, not src/types";
  }

  if (!fromUiContracts) {
    return undefined;
  }

  if (input.specifier.startsWith("node:")) {
    return "src/contracts/ui must stay browser-safe and cannot import node:* modules";
  }
  if (/^src\/v11(?:\/|$)/u.test(normalizedTarget)) {
    return "src/contracts/ui must not import src/v11 runtime internals";
  }
  if (/^(?:src\/)?application(?:\/|$)/u.test(normalizedTarget)) {
    return "src/contracts/ui must not import application internals";
  }
  if (/^(?:src\/)?defaults(?:\/|$)/u.test(normalizedTarget)) {
    return "src/contracts/ui must not import defaults internals";
  }
  if (/^(?:src\/)?infrastructure(?:\/|$)/u.test(normalizedTarget)) {
    return "src/contracts/ui must not import infrastructure internals";
  }
  return undefined;
}

function violationTarget(input: {
  specifier: string;
  resolvedRelative: string | undefined;
}): string {
  return input.resolvedRelative ?? input.specifier;
}

function filterViolationsByExceptions(input: {
  violations: readonly ImportViolation[];
  allowlist: readonly ImportException[];
}): { violations: ImportViolation[]; appliedExceptionIds: string[] } {
  const appliedExceptionIds = new Set<string>();
  const violations: ImportViolation[] = [];

  for (const violation of input.violations) {
    const match = input.allowlist.find(
      (exception) =>
        exception.from === violation.fromRelative && exception.to === violation.target
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
}): Promise<ImportViolation[]> {
  const violations: ImportViolation[] = [];
  for (const filePath of input.files) {
    const sourceText = await readFile(filePath, "utf8");
    const fromRelative = normalizePathToPosix(relative(input.repoRoot, filePath));
    const imports = parseImportSpecifiers({ filePath, sourceText });
    for (const imported of imports) {
      const resolvedRelative = resolveRelativeImportPath({
        importerPath: filePath,
        specifier: imported.specifier,
        repoRoot: input.repoRoot
      });
      const reason = classifyTarget({
        fromRelative,
        specifier: imported.specifier,
        resolvedRelative
      });
      if (reason === undefined) {
        continue;
      }
      violations.push({
        fromRelative,
        target: violationTarget({
          specifier: imported.specifier,
          resolvedRelative
        }),
        line: imported.line,
        reason
      });
    }
  }
  return violations;
}

export async function buildUiContractBoundaryCheckReport({
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
      status: "warn",
      summary: "UI contract boundary check has no configured scope.",
      metric: check.metric,
      details: [
        "Set scope patterns in tools/fitness/policy.json for ui_contract_boundary check."
      ]
    };
  }

  const files = await resolveFilesForScopePatterns(repoRoot, scope);
  if (files.length === 0) {
    const details = [
      `scope=${scope.join(", ")}`,
      "files_scanned=0",
      `exceptions_configured=${String(check.exceptions?.length ?? 0)}`
    ];
    if (parsedExceptions.invalid.length > 0) {
      details.push(`exceptions_invalid=${String(parsedExceptions.invalid.length)}`);
      details.push(...parsedExceptions.invalid.slice(0, 10));
    }
    if (parsedExceptions.invalid.length > 0) {
      return {
        id: check.id,
        owner: check.owner ?? "unknown",
        mode,
        status: "fail",
        summary: `UI contract boundary check failed: ${String(parsedExceptions.invalid.length)} invalid exception entr${parsedExceptions.invalid.length === 1 ? "y" : "ies"}.`,
        metric: check.metric,
        details
      };
    }

    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "pass",
      summary: "UI contract boundary check passed: no files matched current scope.",
      metric: check.metric,
      details
    };
  }

  const allViolations = await collectViolations({ repoRoot, files });
  const filtered = filterViolationsByExceptions({
    violations: allViolations,
    allowlist: parsedExceptions.allowlist
  });
  const details = [
    ...filtered.violations.slice(0, 50).map(
      (violation) =>
        `${violation.fromRelative}:${String(violation.line)} forbidden import ${violation.target}: ${violation.reason}`
    ),
    `scope=${scope.join(", ")}`,
    `files_scanned=${String(files.length)}`,
    `exceptions_configured=${String(check.exceptions?.length ?? 0)}`,
    `exceptions_applied=${String(filtered.appliedExceptionIds.length)}`
  ];
  if (parsedExceptions.invalid.length > 0) {
    details.push(`exceptions_invalid=${String(parsedExceptions.invalid.length)}`);
    details.push(...parsedExceptions.invalid.slice(0, 10));
  }
  if (filtered.appliedExceptionIds.length > 0) {
    details.push(
      `exceptions_applied_ids=${filtered.appliedExceptionIds.join(", ")}`
    );
  }

  if (filtered.violations.length > 0 || parsedExceptions.invalid.length > 0) {
    const violationSummary =
      filtered.violations.length > 0
        ? `${String(filtered.violations.length)} forbidden import(s)`
        : undefined;
    const invalidSummary =
      parsedExceptions.invalid.length > 0
        ? `${String(parsedExceptions.invalid.length)} invalid exception entr${parsedExceptions.invalid.length === 1 ? "y" : "ies"}`
        : undefined;
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "fail",
      summary: `UI contract boundary check failed: ${[violationSummary, invalidSummary].filter((item) => item !== undefined).join(" and ")} detected.`,
      metric: check.metric,
      details
    };
  }

  return {
    id: check.id,
    owner: check.owner ?? "unknown",
    mode,
    status: "pass",
    summary: `UI contract boundary check passed: ${String(files.length)} scoped file(s) scanned, no forbidden UI contract imports.`,
    metric: check.metric,
    details
  };
}
