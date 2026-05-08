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
  kind: "static" | "dynamic";
}

type SharedDefaultsViolationKind =
  | "shared-imports-defaults"
  | "application-imports-shared-defaults";

interface SharedDefaultsViolation {
  kind: SharedDefaultsViolationKind;
  fromRelative: string;
  toRelative: string;
  line: number;
  severity: "fail" | "warn";
}

interface SharedDefaultsBoundaryException {
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
  allowlist: SharedDefaultsBoundaryException[];
  invalid: string[];
} {
  const allowlist: SharedDefaultsBoundaryException[] = [];
  const invalid: string[] = [];

  for (const exception of input.exceptions ?? []) {
    if (exception.kind !== "allow-shared-defaults-boundary-import") {
      invalid.push(
        `exception ${exception.id}: unsupported shared_defaults_boundary exception kind "${exception.kind}"`
      );
      continue;
    }
    if (exception.from === undefined || exception.to === undefined) {
      invalid.push(
        `exception ${exception.id}: allow-shared-defaults-boundary-import requires from/to fields`
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
  const staticStringBindings = new Map<string, string>();

  const readStaticStringExpression = (
    expression: ts.Expression
  ): string | undefined => {
    if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
      return expression.text;
    }
    if (ts.isParenthesizedExpression(expression)) {
      return readStaticStringExpression(expression.expression);
    }
    if (
      ts.isAsExpression(expression) ||
      ts.isSatisfiesExpression(expression) ||
      ts.isTypeAssertionExpression(expression)
    ) {
      return readStaticStringExpression(expression.expression);
    }
    if (
      ts.isCallExpression(expression) &&
      ts.isPropertyAccessExpression(expression.expression) &&
      expression.expression.name.text === "join" &&
      ts.isArrayLiteralExpression(expression.expression.expression) &&
      expression.arguments.length === 1 &&
      expression.arguments[0] !== undefined &&
      ts.isStringLiteral(expression.arguments[0])
    ) {
      const parts: string[] = [];
      for (const element of expression.expression.expression.elements) {
        const value = ts.isExpression(element)
          ? readStaticStringExpression(element)
          : undefined;
        if (value === undefined) {
          return undefined;
        }
        parts.push(value);
      }
      return parts.join(expression.arguments[0].text);
    }
    return undefined;
  };

  const collectStaticStringBindings = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer !== undefined
    ) {
      const value = readStaticStringExpression(node.initializer);
      if (value !== undefined) {
        staticStringBindings.set(node.name.text, value);
      }
    }
    if (
      ts.isFunctionDeclaration(node) &&
      node.name !== undefined &&
      node.parameters.length === 0 &&
      node.body !== undefined
    ) {
      for (const statement of node.body.statements) {
        if (ts.isReturnStatement(statement) && statement.expression !== undefined) {
          const value = readStaticStringExpression(statement.expression);
          if (value !== undefined) {
            staticStringBindings.set(node.name.text, value);
          }
        }
      }
    }
    node.forEachChild(collectStaticStringBindings);
  };

  const resolveDynamicImportSpecifier = (
    argument: ts.Expression
  ): string | undefined => {
    if (ts.isIdentifier(argument)) {
      return staticStringBindings.get(argument.text);
    }
    if (
      ts.isCallExpression(argument) &&
      argument.arguments.length === 0 &&
      ts.isIdentifier(argument.expression)
    ) {
      return staticStringBindings.get(argument.expression.text);
    }
    return readStaticStringExpression(argument);
  };

  const pushSpecifier = (
    specifier: string,
    node: ts.Node,
    kind: ImportSpecifier["kind"]
  ): void => {
    const line =
      sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
    imports.push({ specifier, line, kind });
  };

  collectStaticStringBindings(sourceFile);

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      pushSpecifier(node.moduleSpecifier.text, node.moduleSpecifier, "static");
    } else if (
      ts.isExportDeclaration(node)
      && node.moduleSpecifier !== undefined
      && ts.isStringLiteral(node.moduleSpecifier)
    ) {
      pushSpecifier(node.moduleSpecifier.text, node.moduleSpecifier, "static");
    } else if (
      ts.isCallExpression(node)
      && node.expression.kind === ts.SyntaxKind.ImportKeyword
      && node.arguments.length === 1
    ) {
      const argument = node.arguments[0];
      if (argument !== undefined && ts.isStringLiteral(argument)) {
        pushSpecifier(argument.text, argument, "static");
      } else if (argument !== undefined && ts.isExpression(argument)) {
        const specifier = resolveDynamicImportSpecifier(argument);
        if (specifier !== undefined) {
          pushSpecifier(specifier, argument, "dynamic");
        }
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

function isTypeScriptSourcePath(filePath: string): boolean {
  return filePath.endsWith(".ts") || filePath.endsWith(".tsx");
}

function isApplicationPath(relativePath: string): boolean {
  return /^src\/v11\/application(?:\/|$)/u.test(relativePath);
}

function isDefaultsPath(relativePath: string): boolean {
  return /^src\/v11\/defaults(?:\/|$)/u.test(relativePath);
}

function isSharedPath(relativePath: string): boolean {
  return /^src\/v11\/shared(?:\/|$)/u.test(relativePath);
}

function isSharedDefaultsPath(relativePath: string): boolean {
  return /^src\/v11\/shared\/.+Defaults\.tsx?$/u.test(relativePath);
}

function filterViolationsByExceptions(input: {
  violations: readonly SharedDefaultsViolation[];
  allowlist: readonly SharedDefaultsBoundaryException[];
}): {
  violations: SharedDefaultsViolation[];
  appliedExceptionIds: string[];
} {
  const appliedExceptionIds = new Set<string>();
  const violations: SharedDefaultsViolation[] = [];

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
}): Promise<SharedDefaultsViolation[]> {
  const sourceFiles = input.files.filter(isTypeScriptSourcePath);
  const knownFiles = new Set(sourceFiles);
  const violations: SharedDefaultsViolation[] = [];

  for (const filePath of sourceFiles) {
    const fromRelative = normalizePathToPosix(relative(input.repoRoot, filePath));
    if (!isSharedPath(fromRelative) && !isApplicationPath(fromRelative)) {
      continue;
    }

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
      if (isSharedPath(fromRelative) && isDefaultsPath(toRelative)) {
        violations.push({
          kind: "shared-imports-defaults",
          fromRelative,
          toRelative,
          line: imported.line,
          severity: imported.kind === "static" ? "fail" : "warn"
        });
        continue;
      }
      if (isApplicationPath(fromRelative) && isSharedDefaultsPath(toRelative)) {
        violations.push({
          kind: "application-imports-shared-defaults",
          fromRelative,
          toRelative,
          line: imported.line,
          severity: imported.kind === "static" ? "fail" : "warn"
        });
      }
    }
  }

  return violations.sort((left, right) => {
    const fileCompare = left.fromRelative.localeCompare(right.fromRelative);
    return fileCompare === 0 ? left.line - right.line : fileCompare;
  });
}

function formatViolation(violation: SharedDefaultsViolation): string {
  if (violation.kind === "shared-imports-defaults") {
    return violation.severity === "fail"
      ? `${violation.fromRelative}:${String(violation.line)} shared imports defaults runtime wiring -> ${violation.toRelative}`
      : `${violation.fromRelative}:${String(violation.line)} [warn] shared dynamic-imports defaults runtime wiring -> ${violation.toRelative}`;
  }
  return violation.severity === "fail"
    ? `${violation.fromRelative}:${String(violation.line)} application imports shared defaults facade -> ${violation.toRelative}`
    : `${violation.fromRelative}:${String(violation.line)} [warn] application dynamic-imports shared defaults facade -> ${violation.toRelative}`;
}

export async function buildSharedDefaultsBoundaryCheckReport({
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
      summary: "Shared defaults boundary check has no configured scope.",
      metric: check.metric,
      details: [
        "Set scope patterns in tools/fitness/policy.json for shared_defaults_boundary check."
      ]
    };
  }

  const files = await resolveFilesForScopePatterns(repoRoot, scope);
  const allViolations = await collectViolations({ repoRoot, files });
  const filtered = filterViolationsByExceptions({
    violations: allViolations,
    allowlist: parsedExceptions.allowlist
  });
  const sharedDefaultsCount = filtered.violations.filter(
    (violation) =>
      violation.kind === "shared-imports-defaults" &&
      violation.severity === "fail"
  ).length;
  const applicationFacadeCount = filtered.violations.filter(
    (violation) =>
      violation.kind === "application-imports-shared-defaults" &&
      violation.severity === "fail"
  ).length;
  const dynamicDefaultsCount = filtered.violations.filter(
    (violation) => violation.severity === "warn"
  ).length;
  const details = [
    ...filtered.violations.slice(0, 100).map(formatViolation),
    filtered.violations.length > 100
      ? `violations_truncated=${String(filtered.violations.length - 100)}`
      : undefined,
    `scope=${scope.join(", ")}`,
    `files_scanned=${String(files.length)}`,
    `shared_imports_defaults=${String(sharedDefaultsCount)}`,
    `application_imports_shared_defaults=${String(applicationFacadeCount)}`,
    `dynamic_defaults_imports=${String(dynamicDefaultsCount)}`,
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

  const failCount = filtered.violations.filter(
    (violation) => violation.severity === "fail"
  ).length;
  const warnCount = filtered.violations.filter(
    (violation) => violation.severity === "warn"
  ).length;
  const problemCount = failCount + parsedExceptions.invalid.length;
  if (problemCount > 0) {
    const violationSummary =
      failCount > 0
        ? `${String(failCount)} shared-defaults boundary import(s)`
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
      summary: `Shared defaults boundary check ${mode === "hard-fail" ? "failed" : "warning"}: ${[violationSummary, invalidSummary].filter((item) => item !== undefined).join(" and ")} detected.`,
      metric: check.metric,
      details
    };
  }

  if (warnCount > 0) {
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: mode === "hard-fail" ? "fail" : "warn",
      summary: `Shared defaults boundary check ${mode === "hard-fail" ? "failed" : "warning"}: ${String(warnCount)} dynamic shared-defaults boundary import(s) detected.`,
      metric: check.metric,
      details
    };
  }

  return {
    id: check.id,
    owner: check.owner ?? "unknown",
    mode,
    status: "pass",
    summary: `Shared defaults boundary check passed: ${String(files.length)} scoped file(s) scanned, no shared defaults facade imports.`,
    metric: check.metric,
    details
  };
}
