import { readdir, readFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";

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

interface FlatApplicationCommandDirectoryViolation {
  commandRoot: string;
  directTypeScriptFileCount: number;
}

interface InternalReexportCamouflageCandidate {
  fileRelative: string;
  ownerRoot: string;
  exportCount: number;
}

interface InternalImportException {
  id: string;
  from: string;
  to: string;
}

interface InternalReexportCamouflageException {
  id: string;
  from: string;
}

const maxFlatApplicationCommandFiles = 27;

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
  reexportCamouflageAllowlist: InternalReexportCamouflageException[];
  invalid: string[];
} {
  const allowlist: InternalImportException[] = [];
  const reexportCamouflageAllowlist: InternalReexportCamouflageException[] = [];
  const invalid: string[] = [];

  for (const exception of input.exceptions ?? []) {
    if (exception.kind === "allow-internal-reexport-camouflage") {
      if (exception.from === undefined) {
        invalid.push(
          `exception ${exception.id}: allow-internal-reexport-camouflage requires from field`
        );
        continue;
      }
      reexportCamouflageAllowlist.push({
        id: exception.id,
        from: normalizeRelativePolicyPath(exception.from, input.repoRoot)
      });
      continue;
    }

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

  return { allowlist, reexportCamouflageAllowlist, invalid };
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

function hasInternalChild(input: {
  ownerRoot: string;
  knownRelativeFiles: ReadonlySet<string>;
}): boolean {
  const internalPrefix = `${input.ownerRoot}/internal/`;
  for (const file of input.knownRelativeFiles) {
    if (file.startsWith(internalPrefix)) {
      return true;
    }
  }
  return false;
}

function isPureInternalReexportFile(input: {
  filePath: string;
  sourceText: string;
}): { isCandidate: boolean; exportCount: number } {
  const sourceFile = ts.createSourceFile(
    input.filePath,
    input.sourceText,
    ts.ScriptTarget.Latest,
    true
  );

  const statements = sourceFile.statements.filter((statement) => {
    if (ts.isEmptyStatement(statement)) {
      return false;
    }
    return true;
  });
  if (statements.length === 0) {
    return { isCandidate: false, exportCount: 0 };
  }

  let exportCount = 0;
  for (const statement of statements) {
    if (
      !ts.isExportDeclaration(statement)
      || statement.moduleSpecifier === undefined
      || !ts.isStringLiteral(statement.moduleSpecifier)
      || !statement.moduleSpecifier.text.startsWith("./internal/")
    ) {
      return { isCandidate: false, exportCount: 0 };
    }
    exportCount += 1;
  }

  return { isCandidate: true, exportCount };
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

function filterInternalReexportCamouflageCandidatesByExceptions(input: {
  candidates: readonly InternalReexportCamouflageCandidate[];
  allowlist: readonly InternalReexportCamouflageException[];
}): {
  candidates: InternalReexportCamouflageCandidate[];
  appliedExceptionIds: string[];
} {
  const appliedExceptionIds = new Set<string>();
  const candidates: InternalReexportCamouflageCandidate[] = [];

  for (const candidate of input.candidates) {
    const match = input.allowlist.find(
      (exception) => exception.from === candidate.fileRelative
    );
    if (match !== undefined) {
      appliedExceptionIds.add(match.id);
      continue;
    }
    candidates.push(candidate);
  }

  return {
    candidates,
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

async function collectInternalReexportCamouflageCandidates(input: {
  repoRoot: string;
  files: readonly string[];
}): Promise<InternalReexportCamouflageCandidate[]> {
  const knownRelativeFiles = new Set(
    input.files.map((filePath) =>
      normalizePathToPosix(relative(input.repoRoot, filePath))
    )
  );
  const candidates: InternalReexportCamouflageCandidate[] = [];

  for (const filePath of input.files) {
    const fileRelative = normalizePathToPosix(relative(input.repoRoot, filePath));
    if (fileRelative.includes("/internal/")) {
      continue;
    }
    const ownerRoot = dirname(fileRelative);
    if (!hasInternalChild({ ownerRoot, knownRelativeFiles })) {
      continue;
    }
    const sourceText = await readFile(filePath, "utf8");
    const candidate = isPureInternalReexportFile({ filePath, sourceText });
    if (!candidate.isCandidate) {
      continue;
    }
    candidates.push({
      fileRelative,
      ownerRoot,
      exportCount: candidate.exportCount
    });
  }

  return candidates.sort((left, right) =>
    left.fileRelative.localeCompare(right.fileRelative)
  );
}

async function collectFlatApplicationCommandDirectoryViolations(repoRoot: string): Promise<
  FlatApplicationCommandDirectoryViolation[]
> {
  const applicationRoot = resolve(repoRoot, "src/v11/application");
  let commandEntries;
  try {
    commandEntries = await readdir(applicationRoot, { withFileTypes: true });
  } catch {
    return [];
  }

  const violations: FlatApplicationCommandDirectoryViolation[] = [];
  for (const commandEntry of commandEntries) {
    if (!commandEntry.isDirectory()) {
      continue;
    }
    const commandPath = join(applicationRoot, commandEntry.name);
    const childEntries = await readdir(commandPath, { withFileTypes: true });
    const directDirectoryCount = childEntries.filter((entry) =>
      entry.isDirectory()
    ).length;
    if (directDirectoryCount > 0) {
      continue;
    }
    const directTypeScriptFileCount = childEntries.filter((entry) =>
      entry.isFile() && entry.name.endsWith(".ts")
    ).length;
    if (directTypeScriptFileCount <= maxFlatApplicationCommandFiles) {
      continue;
    }
    violations.push({
      commandRoot: normalizePathToPosix(relative(repoRoot, commandPath)),
      directTypeScriptFileCount
    });
  }

  return violations.sort((left, right) =>
    left.commandRoot.localeCompare(right.commandRoot)
  );
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
  const internalReexportCamouflageCandidates =
    await collectInternalReexportCamouflageCandidates({ repoRoot, files });
  const flatCommandDirectoryViolations =
    await collectFlatApplicationCommandDirectoryViolations(repoRoot);
  const filtered = filterViolationsByExceptions({
    violations: allViolations,
    allowlist: parsedExceptions.allowlist
  });
  const filteredCamouflage =
    filterInternalReexportCamouflageCandidatesByExceptions({
      candidates: internalReexportCamouflageCandidates,
      allowlist: parsedExceptions.reexportCamouflageAllowlist
    });
  const details = [
    ...filtered.violations.slice(0, 100).map(
      (violation) =>
        `${violation.fromRelative}:${String(violation.line)} imports private internal module ${violation.toRelative}; owner_root=${violation.ownerRoot}`
    ),
    filtered.violations.length > 100
      ? `violations_truncated=${String(filtered.violations.length - 100)}`
      : undefined,
    ...flatCommandDirectoryViolations.map(
      (violation) =>
        `${violation.commandRoot} is an oversized flat application command directory (${String(violation.directTypeScriptFileCount)} direct .ts file(s)); introduce internal/ or named subdirectories.`
    ),
    ...filteredCamouflage.candidates.slice(0, 100).map(
      (candidate) =>
        `${candidate.fileRelative} is report-only internal re-export camouflage (${String(candidate.exportCount)} export(s) from ./internal/**); owner_root=${candidate.ownerRoot}`
    ),
    filteredCamouflage.candidates.length > 100
      ? `internal_reexport_camouflage_truncated=${String(filteredCamouflage.candidates.length - 100)}`
      : undefined,
    `scope=${scope.join(", ")}`,
    `files_scanned=${String(files.length)}`,
    `flat_application_command_directory_threshold=${String(maxFlatApplicationCommandFiles)}`,
    `flat_application_command_directory_violations=${String(flatCommandDirectoryViolations.length)}`,
    `internal_reexport_camouflage_candidates=${String(filteredCamouflage.candidates.length)}`,
    `exceptions_configured=${String(check.exceptions?.length ?? 0)}`,
    `exceptions_applied=${String(filtered.appliedExceptionIds.length + filteredCamouflage.appliedExceptionIds.length)}`
  ].filter((detail) => detail !== undefined);

  if (parsedExceptions.invalid.length > 0) {
    details.push(`exceptions_invalid=${String(parsedExceptions.invalid.length)}`);
    details.push(...parsedExceptions.invalid.slice(0, 10));
  }
  const appliedExceptionIds = [
    ...filtered.appliedExceptionIds,
    ...filteredCamouflage.appliedExceptionIds
  ].sort((left, right) => left.localeCompare(right));
  if (appliedExceptionIds.length > 0) {
    details.push(
      `exceptions_applied_ids=${appliedExceptionIds.join(", ")}`
    );
  }

  const problemCount =
    filtered.violations.length
    + flatCommandDirectoryViolations.length
    + parsedExceptions.invalid.length;
  const warningCount = filteredCamouflage.candidates.length;
  if (problemCount > 0) {
    const violationSummary =
      filtered.violations.length > 0
        ? `${String(filtered.violations.length)} external internal-module import(s)`
        : undefined;
    const flatDirectorySummary =
      flatCommandDirectoryViolations.length > 0
        ? `${String(flatCommandDirectoryViolations.length)} oversized flat application command director${flatCommandDirectoryViolations.length === 1 ? "y" : "ies"}`
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
      summary: `Internal module boundary check ${mode === "hard-fail" ? "failed" : "warning"}: ${[violationSummary, flatDirectorySummary, invalidSummary].filter((item) => item !== undefined).join(" and ")} detected.`,
      metric: check.metric,
      details
    };
  }

  if (warningCount > 0) {
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "warn",
      summary: `Internal module boundary check warning: ${String(warningCount)} report-only internal re-export camouflage candidate${warningCount === 1 ? "" : "s"} detected.`,
      metric: check.metric,
      details
    };
  }

  return {
    id: check.id,
    owner: check.owner ?? "unknown",
    mode,
    status: "pass",
    summary: `Internal module boundary check passed: ${String(files.length)} scoped file(s) scanned, no external /internal/ imports, oversized flat application command directories, or internal re-export camouflage candidates.`,
    metric: check.metric,
    details
  };
}
