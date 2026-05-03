import { access, readFile } from "node:fs/promises";
import { basename, dirname, extname, relative, resolve } from "node:path";

import ts from "typescript";

import { normalizePathToPosix, resolveFilesForScopePatterns } from "../scope.js";
import type {
  FitnessPolicyCheck,
  FitnessPolicyException,
  FitnessReportCheck
} from "../types.js";

type RouterPortViolationKind =
  | "full-dependency-bag"
  | "command-owned-ui-port-import";

interface RouterPortViolation {
  kind: RouterPortViolationKind;
  fromRelative: string;
  target: string;
  line: number;
  reasonCode:
    | "FULL_UI_ROUTER_DEPENDENCY_BAG_USAGE"
    | "COMMAND_OWNED_UI_PORT_IMPORT";
  detail: string;
}

interface FullDependencyBagException {
  id: string;
  kind: "full-dependency-bag";
  path: string;
}

interface CommandOwnedImportException {
  id: string;
  kind: "command-owned-ui-port-import";
  from: string;
  to: string;
}

type RouterPortException =
  | FullDependencyBagException
  | CommandOwnedImportException;

interface ParsedExceptions {
  allowlist: RouterPortException[];
  invalid: string[];
}

interface ParsedSourceFile {
  sourceFile: ts.SourceFile;
  diagnosticsCount: number;
}

interface ImportSpecifier {
  specifier: string;
  line: number;
}

const defaultAllowedFullBagCompositionPaths = new Set([
  "src/v11/infrastructure/ui/router.ts",
  "src/v11/infrastructure/ui/routerContracts.ts",
  "src/v11/infrastructure/ui/routerDependencies.ts"
]);

const commandOwnedBasenamePattern =
  /(?:Command(?:Api|Contract)?|Inbox|Status|List)(?:[A-Z0-9]|[._-]|$)/u;

function invalidException(id: string | undefined, reason: string): string {
  return `INVALID_ROUTER_PORT_EXCEPTION exception ${id ?? "<missing-id>"}: ${reason}`;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
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
  if (
    normalizedPath.length === 0 ||
    normalizedPath.endsWith("/") ||
    normalizedPath.includes("/../") ||
    /[*?[{]/u.test(normalizedPath)
  ) {
    return {
      path: normalizedPath,
      error: `path must be an exact normalized repo-relative file path: ${inputPath}`
    };
  }
  return { path: normalizedPath, error: undefined };
}

function hasNonEmptyBaseFields(exception: FitnessPolicyException): boolean {
  return (
    isNonEmptyString(exception.id) &&
    isNonEmptyString(exception.owner) &&
    isNonEmptyString(exception.reason)
  );
}

function normalizeFullBagPath(path: string): string | undefined {
  const normalized = normalizePathToPosix(path).replace(/^\.\//u, "");
  if (!normalized.endsWith("#UiRouterDependencies")) {
    return undefined;
  }
  const filePath = normalized.slice(0, -"#UiRouterDependencies".length);
  if (
    filePath.length === 0 ||
    filePath.endsWith("/") ||
    /[*?[{]/u.test(filePath)
  ) {
    return undefined;
  }
  return `${filePath}#UiRouterDependencies`;
}

async function parseRouterPortExceptions(input: {
  repoRoot: string;
  exceptions: readonly FitnessPolicyException[] | undefined;
}): Promise<ParsedExceptions> {
  const allowlist: RouterPortException[] = [];
  const invalid: string[] = [];
  const seenExceptionIds = new Set<string>();
  const duplicateExceptionIds = new Set<string>();

  for (const exception of input.exceptions ?? []) {
    if (!isNonEmptyString(exception.id)) {
      continue;
    }
    if (seenExceptionIds.has(exception.id)) {
      duplicateExceptionIds.add(exception.id);
    }
    seenExceptionIds.add(exception.id);
  }

  for (const exception of input.exceptions ?? []) {
    if (!hasNonEmptyBaseFields(exception)) {
      invalid.push(
        invalidException(
          exception.id,
          "router-port exceptions require non-empty id, owner, and reason"
        )
      );
      continue;
    }
    if (duplicateExceptionIds.has(exception.id)) {
      invalid.push(
        invalidException(exception.id, "duplicate router-port exception id")
      );
      continue;
    }
    seenExceptionIds.add(exception.id);

    if (exception.kind === "allow-full-dependency-bag") {
      if (exception.from !== undefined || exception.to !== undefined) {
        invalid.push(
          invalidException(
            exception.id,
            "allow-full-dependency-bag must use paths only, not from/to"
          )
        );
        continue;
      }
      if (!Array.isArray(exception.paths) || exception.paths.length !== 1) {
        invalid.push(
          invalidException(
            exception.id,
            "allow-full-dependency-bag requires exactly one paths entry"
          )
        );
        continue;
      }
      if (typeof exception.paths[0] !== "string") {
        invalid.push(
          invalidException(
            exception.id,
            "allow-full-dependency-bag paths[0] must be a string"
          )
        );
        continue;
      }
      const path = normalizeFullBagPath(exception.paths[0]);
      if (path === undefined) {
        invalid.push(
          invalidException(
            exception.id,
            "allow-full-dependency-bag paths[0] must be <relative-file>#UiRouterDependencies"
          )
        );
        continue;
      }
      const filePath = normalizePolicyPath(
        path.slice(0, -"#UiRouterDependencies".length),
        input.repoRoot
      );
      if (filePath.error !== undefined) {
        invalid.push(invalidException(exception.id, filePath.error));
        continue;
      }
      allowlist.push({
        id: exception.id,
        kind: "full-dependency-bag",
        path
      });
      continue;
    }

    if (exception.kind === "allow-command-owned-ui-port-import") {
      if (exception.paths !== undefined) {
        invalid.push(
          invalidException(
            exception.id,
            "allow-command-owned-ui-port-import must use from/to only, not paths"
          )
        );
        continue;
      }
      if (typeof exception.from !== "string" || typeof exception.to !== "string") {
        invalid.push(
          invalidException(
            exception.id,
            "allow-command-owned-ui-port-import requires from/to"
          )
        );
        continue;
      }
      const from = normalizePolicyPath(exception.from, input.repoRoot);
      const to = normalizePolicyPath(exception.to, input.repoRoot);
      if (from.error !== undefined || to.error !== undefined) {
        invalid.push(
          invalidException(
            exception.id,
            [from.error, to.error].filter((item) => item !== undefined).join("; ")
          )
        );
        continue;
      }
      if (!from.path.endsWith(".ts") || !to.path.endsWith(".ts")) {
        invalid.push(
          invalidException(
            exception.id,
            "allow-command-owned-ui-port-import from/to must resolve to exact .ts source files"
          )
        );
        continue;
      }
      const missingPaths = (
        await Promise.all(
          [from.path, to.path].map(async (path) => ({
            path,
            exists: await pathExists(input.repoRoot, path)
          }))
        )
      )
        .filter((result) => !result.exists)
        .map((result) => result.path);
      if (missingPaths.length > 0) {
        invalid.push(
          invalidException(
            exception.id,
            `allow-command-owned-ui-port-import from/to must exist: ${missingPaths.join(", ")}`
          )
        );
        continue;
      }
      allowlist.push({
        id: exception.id,
        kind: "command-owned-ui-port-import",
        from: from.path,
        to: to.path
      });
      continue;
    }

    invalid.push(
      invalidException(
        exception.id,
        `unsupported ui_router_port_boundary exception kind "${exception.kind}"`
      )
    );
  }

  return { allowlist, invalid };
}

function parseSourceFile(filePath: string, sourceText: string): ParsedSourceFile {
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true
  );
  const diagnosticsCount =
    ts.transpileModule(sourceText, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.Latest
      },
      fileName: filePath,
      reportDiagnostics: true
    }).diagnostics?.length ?? 0;
  return { sourceFile, diagnosticsCount };
}

function lineForNode(sourceFile: ts.SourceFile, node: ts.Node): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function parseImportSpecifiers(sourceFile: ts.SourceFile): ImportSpecifier[] {
  const imports: ImportSpecifier[] = [];

  const pushSpecifier = (specifier: string, node: ts.Node): void => {
    imports.push({
      specifier,
      line: lineForNode(sourceFile, node)
    });
  };

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      pushSpecifier(node.moduleSpecifier.text, node.moduleSpecifier);
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      pushSpecifier(node.moduleSpecifier.text, node.moduleSpecifier);
    }
    node.forEachChild(visit);
  };

  visit(sourceFile);
  return imports;
}

function resolveSupportedCommandImport(input: {
  importerPath: string;
  specifier: string;
  repoRoot: string;
}): { target: string | undefined; resolverDetail: string | undefined } {
  if (!input.specifier.startsWith(".")) {
    return {
      target: undefined,
      resolverDetail: "unsupported non-relative import specifier"
    };
  }
  const rawExt = extname(input.specifier);
  const rawTarget = resolve(dirname(input.importerPath), input.specifier);
  const candidateTarget =
    rawExt === ".js"
      ? rawTarget.slice(0, -".js".length) + ".ts"
      : rawExt.length === 0
        ? `${rawTarget}.ts`
        : rawTarget;
  const normalizedCandidate = normalizePathToPosix(
    relative(input.repoRoot, candidateTarget)
  );
  if (
    normalizedCandidate === ".." ||
    normalizedCandidate.startsWith("../")
  ) {
    return {
      target: undefined,
      resolverDetail: "resolved import target escapes repo root"
    };
  }
  if (rawExt !== ".js") {
    return {
      target: normalizedCandidate,
      resolverDetail: `unsupported import specifier extension "${rawExt || "<none>"}"`
    };
  }
  return {
    target: normalizedCandidate,
    resolverDetail: undefined
  };
}

function isCommandOwnedTarget(pathOrSpecifier: string): boolean {
  const normalized = normalizePathToPosix(pathOrSpecifier).replace(/^\.\//u, "");
  if (normalized.startsWith("src/contracts/ui/")) {
    return false;
  }
  const fileBase = basename(normalized, extname(normalized));
  return (
    normalized.startsWith("src/v11/shared/") &&
    commandOwnedBasenamePattern.test(fileBase)
  );
}

async function pathExists(repoRoot: string, relativePath: string): Promise<boolean> {
  try {
    await access(resolve(repoRoot, relativePath));
    return true;
  } catch {
    return false;
  }
}

function fullBagViolationIdentity(fromRelative: string): string {
  return `${fromRelative}#UiRouterDependencies`;
}

function isFullBagLeafCandidate(
  fromRelative: string,
  allowedCompositionPaths: ReadonlySet<string>
): boolean {
  return (
    fromRelative.startsWith("src/v11/infrastructure/ui/") &&
    fromRelative.endsWith(".ts") &&
    !allowedCompositionPaths.has(fromRelative)
  );
}

function hasDirectUiRouterDependenciesReference(sourceFile: ts.SourceFile): {
  found: boolean;
  line: number;
} {
  let foundLine = 1;
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found) {
      return;
    }
    if (
      ts.isTypeReferenceNode(node) &&
      ts.isIdentifier(node.typeName) &&
      node.typeName.text === "UiRouterDependencies"
    ) {
      found = true;
      foundLine = lineForNode(sourceFile, node);
      return;
    }
    node.forEachChild(visit);
  };
  visit(sourceFile);
  return { found, line: foundLine };
}

function typeNodeReferences(
  typeNode: ts.TypeNode | undefined,
  typeName: string
): boolean {
  if (typeNode === undefined) {
    return false;
  }
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found) {
      return;
    }
    if (
      ts.isTypeReferenceNode(node) &&
      ts.isIdentifier(node.typeName) &&
      node.typeName.text === typeName
    ) {
      found = true;
      return;
    }
    node.forEachChild(visit);
  };
  visit(typeNode);
  return found;
}

function typeNodeHasPropertyReference(
  typeNode: ts.TypeNode | undefined,
  propertyName: string,
  referencedTypeName: string
): boolean {
  if (typeNode === undefined) {
    return false;
  }
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found) {
      return;
    }
    if (ts.isTypeLiteralNode(node)) {
      const matchingProperty = node.members.find(
        (member) =>
          ts.isPropertySignature(member) &&
          ts.isIdentifier(member.name) &&
          member.name.text === propertyName &&
          typeNodeReferences(member.type, referencedTypeName)
      );
      if (matchingProperty !== undefined) {
        found = true;
        return;
      }
    }
    node.forEachChild(visit);
  };
  visit(typeNode);
  return found;
}

function hasEnvironmentDependenciesAccess(sourceFile: ts.SourceFile): {
  found: boolean;
  line: number;
} {
  let foundLine = 1;
  let found = false;
  const markFound = (node: ts.Node): void => {
    if (!found) {
      found = true;
      foundLine = lineForNode(sourceFile, node);
    }
  };

  const wrapperIdentifiers = new Set<string>();
  const wrapperContainerIdentifiers = new Set<string>();
  const interfaceTypesWithWrapperEnvironment = new Set<string>();

  const indexInterfaceTypes = (node: ts.Node): void => {
    if (ts.isInterfaceDeclaration(node)) {
      const hasWrapperEnvironmentProperty = node.members.some(
        (member) =>
          ts.isPropertySignature(member) &&
          member.type !== undefined &&
          ts.isIdentifier(member.name) &&
          member.name.text === "environment" &&
          typeNodeReferences(member.type, "UiRouterEnvironment")
      );
      if (hasWrapperEnvironmentProperty) {
        interfaceTypesWithWrapperEnvironment.add(node.name.text);
      }
    }
    node.forEachChild(indexInterfaceTypes);
  };

  const isEnvironmentExpression = (node: ts.Node): boolean =>
    ts.isIdentifier(node) && wrapperIdentifiers.has(node.text);

  const isWrapperEnvironmentProperty = (node: ts.Node): boolean =>
    ts.isPropertyAccessExpression(node) &&
    node.name.text === "environment" &&
    ts.isIdentifier(node.expression) &&
    wrapperContainerIdentifiers.has(node.expression.text);

  const isEnvironmentDependencies = (node: ts.Node): boolean =>
    ts.isPropertyAccessExpression(node) &&
    node.name.text === "dependencies" &&
    (isEnvironmentExpression(node.expression) ||
      isWrapperEnvironmentProperty(node.expression));

  const isEnvironmentDependenciesMember = (node: ts.Node): boolean =>
    ts.isPropertyAccessExpression(node) &&
    isEnvironmentDependencies(node.expression);

  const visit = (node: ts.Node): void => {
    if (
      (ts.isParameter(node) || ts.isVariableDeclaration(node)) &&
      ts.isIdentifier(node.name)
    ) {
      if (typeNodeReferences(node.type, "UiRouterEnvironment")) {
        if (typeNodeHasPropertyReference(
          node.type,
          "environment",
          "UiRouterEnvironment"
        )) {
          wrapperContainerIdentifiers.add(node.name.text);
        } else {
          wrapperIdentifiers.add(node.name.text);
        }
      }
      if (
        node.type !== undefined &&
        ts.isTypeReferenceNode(node.type) &&
        ts.isIdentifier(node.type.typeName) &&
        interfaceTypesWithWrapperEnvironment.has(node.type.typeName.text)
      ) {
        wrapperContainerIdentifiers.add(node.name.text);
      }
    }
    if (!found && isEnvironmentDependenciesMember(node)) {
      markFound(node);
    } else if (
      !found &&
      ts.isVariableDeclaration(node) &&
      node.initializer !== undefined &&
      isEnvironmentDependencies(node.initializer)
    ) {
      markFound(node);
    } else if (
      !found &&
      ts.isBindingElement(node) &&
      ts.isObjectBindingPattern(node.parent) &&
      ts.isVariableDeclaration(node.parent.parent) &&
      node.parent.parent.initializer !== undefined &&
      (isEnvironmentDependencies(node.parent.parent.initializer) ||
        (isEnvironmentExpression(node.parent.parent.initializer) &&
          ts.isIdentifier(node.name) &&
          node.name.text === "dependencies"))
    ) {
      markFound(node);
    }
    node.forEachChild(visit);
  };

  indexInterfaceTypes(sourceFile);
  visit(sourceFile);
  return { found, line: foundLine };
}

function collectFullBagViolations(input: {
  sourceFile: ts.SourceFile;
  fromRelative: string;
  allowedCompositionPaths: ReadonlySet<string>;
}): RouterPortViolation[] {
  if (!isFullBagLeafCandidate(input.fromRelative, input.allowedCompositionPaths)) {
    return [];
  }
  const direct = hasDirectUiRouterDependenciesReference(input.sourceFile);
  const wrapper = hasEnvironmentDependenciesAccess(input.sourceFile);
  const matched = direct.found ? direct : wrapper;
  if (!matched.found) {
    return [];
  }
  return [
    {
      kind: "full-dependency-bag",
      fromRelative: input.fromRelative,
      target: fullBagViolationIdentity(input.fromRelative),
      line: matched.line,
      reasonCode: "FULL_UI_ROUTER_DEPENDENCY_BAG_USAGE",
      detail:
        "full_dependency_bag_usage: router leaf modules must consume narrow UI router capability slices, not UiRouterDependencies or environment.dependencies"
    }
  ];
}

async function collectCommandOwnedImportViolations(input: {
  filePath: string;
  repoRoot: string;
  fromRelative: string;
  sourceFile: ts.SourceFile;
}): Promise<RouterPortViolation[]> {
  if (
    !input.fromRelative.startsWith("src/v11/shared/ports/") ||
    !input.fromRelative.endsWith(".ts")
  ) {
    return [];
  }

  const violations: RouterPortViolation[] = [];
  const imports = parseImportSpecifiers(input.sourceFile);
  for (const imported of imports) {
    const resolved = resolveSupportedCommandImport({
      importerPath: input.filePath,
      specifier: imported.specifier,
      repoRoot: input.repoRoot
    });
    const candidateTarget = resolved.target ?? imported.specifier;
    if (!isCommandOwnedTarget(candidateTarget)) {
      continue;
    }
    const resolverDetail =
      resolved.target === undefined
        ? resolved.resolverDetail
        : [
            resolved.resolverDetail,
            (await pathExists(input.repoRoot, resolved.target))
              ? undefined
              : `resolved import target is missing: ${resolved.target}`
          ]
            .filter((item) => item !== undefined)
            .join("; ") || undefined;
    violations.push({
      kind: "command-owned-ui-port-import",
      fromRelative: input.fromRelative,
      target: resolved.target ?? imported.specifier,
      line: imported.line,
      reasonCode: "COMMAND_OWNED_UI_PORT_IMPORT",
      detail: [
        "command_owned_ui_port_import: shared UI ports must not expose command-owned list/status/inbox contracts",
        resolverDetail !== undefined ? `resolver_detail=${resolverDetail}` : undefined
      ]
        .filter((item) => item !== undefined)
        .join("; ")
    });
  }
  return violations;
}

async function collectViolations(input: {
  repoRoot: string;
  files: readonly string[];
  allowedCompositionPaths: ReadonlySet<string>;
}): Promise<{ violations: RouterPortViolation[]; scanFailures: string[] }> {
  const violations: RouterPortViolation[] = [];
  const scanFailures: string[] = [];

  for (const filePath of input.files) {
    const fromRelative = normalizePathToPosix(relative(input.repoRoot, filePath));
    let sourceText: string;
    try {
      sourceText = await readFile(filePath, "utf8");
    } catch (error) {
      scanFailures.push(
        `ROUTER_PORT_SCAN_READ_FAILED ${fromRelative}: unreadable scan input: ${String(error)}`
      );
      continue;
    }
    const { sourceFile, diagnosticsCount } = parseSourceFile(filePath, sourceText);
    if (diagnosticsCount > 0) {
      scanFailures.push(
        `ROUTER_PORT_SCAN_READ_FAILED ${fromRelative}: TypeScript parse diagnostics=${String(diagnosticsCount)}`
      );
      continue;
    }
    violations.push(
      ...collectFullBagViolations({
        sourceFile,
        fromRelative,
        allowedCompositionPaths: input.allowedCompositionPaths
      }),
      ...(await collectCommandOwnedImportViolations({
        filePath,
        repoRoot: input.repoRoot,
        fromRelative,
        sourceFile
      }))
    );
  }

  return { violations, scanFailures };
}

function exceptionMatchesViolation(
  exception: RouterPortException,
  violation: RouterPortViolation
): boolean {
  if (
    exception.kind === "full-dependency-bag" &&
    violation.kind === "full-dependency-bag"
  ) {
    return exception.path === violation.target;
  }
  if (
    exception.kind === "command-owned-ui-port-import" &&
    violation.kind === "command-owned-ui-port-import"
  ) {
    return exception.from === violation.fromRelative && exception.to === violation.target;
  }
  return false;
}

function filterViolationsByExceptions(input: {
  violations: readonly RouterPortViolation[];
  allowlist: readonly RouterPortException[];
}): {
  violations: RouterPortViolation[];
  appliedExceptionIds: string[];
  unusedExceptionIds: string[];
} {
  const appliedExceptionIds = new Set<string>();
  const remainingViolations: RouterPortViolation[] = [];

  for (const violation of input.violations) {
    const match = input.allowlist.find((exception) =>
      exceptionMatchesViolation(exception, violation)
    );
    if (match !== undefined) {
      appliedExceptionIds.add(match.id);
      continue;
    }
    remainingViolations.push(violation);
  }

  const unusedExceptionIds = input.allowlist
    .filter((exception) => !appliedExceptionIds.has(exception.id))
    .map((exception) => exception.id)
    .sort((left, right) => left.localeCompare(right));

  return {
    violations: remainingViolations,
    appliedExceptionIds: [...appliedExceptionIds].sort((left, right) =>
      left.localeCompare(right)
    ),
    unusedExceptionIds
  };
}

async function resolveRequiredScopeFiles(input: {
  repoRoot: string;
  scope: readonly string[];
}): Promise<{ files: string[]; missing: string[] }> {
  const files = await resolveFilesForScopePatterns(input.repoRoot, input.scope);
  const requiredExactPaths = input.scope.filter(
    (scopeEntry) => !/[*?[{]/u.test(scopeEntry)
  );
  const missing: string[] = [];
  for (const requiredPath of requiredExactPaths) {
    const normalized = normalizePathToPosix(requiredPath).replace(/^\.\//u, "");
    try {
      await access(resolve(input.repoRoot, normalized));
    } catch {
      missing.push(normalized);
    }
  }
  return { files, missing };
}

export async function buildUiRouterPortBoundaryCheckReport({
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
  const parsedExceptions = await parseRouterPortExceptions({
    repoRoot,
    exceptions: check.exceptions
  });
  const allowedCompositionPaths = new Set(defaultAllowedFullBagCompositionPaths);

  if (scope.length === 0) {
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "fail",
      summary: "UI router port boundary check failed: no configured scope.",
      metric: check.metric,
      details: [
        "ROUTER_PORT_SCAN_READ_FAILED no scope configured for ui_router_port_boundary"
      ]
    };
  }

  const resolvedScope = await resolveRequiredScopeFiles({ repoRoot, scope });
  const collected = await collectViolations({
    repoRoot,
    files: resolvedScope.files,
    allowedCompositionPaths
  });
  const filtered = filterViolationsByExceptions({
    violations: collected.violations,
    allowlist: parsedExceptions.allowlist
  });

  const details = [
    ...filtered.violations.slice(0, 50).map(
      (violation) =>
        `${violation.reasonCode} ${violation.fromRelative}:${String(violation.line)} ${violation.target}: ${violation.detail}`
    ),
    filtered.violations.length > 50
      ? `violations_truncated=${String(filtered.violations.length - 50)}`
      : undefined,
    ...resolvedScope.missing.map(
      (path) => `ROUTER_PORT_SCAN_READ_FAILED missing_scan_input=${path}`
    ),
    ...collected.scanFailures.slice(0, 20),
    collected.scanFailures.length > 20
      ? `scan_failures_truncated=${String(collected.scanFailures.length - 20)}`
      : undefined,
    `scope=${scope.join(", ")}`,
    `files_scanned=${String(resolvedScope.files.length)}`,
    `exceptions_configured=${String(check.exceptions?.length ?? 0)}`,
    `exceptions_applied=${String(filtered.appliedExceptionIds.length)}`
  ].filter((detail) => detail !== undefined);
  if (filtered.appliedExceptionIds.length > 0) {
    details.push(
      `TRANSITIONAL_EXCEPTION_APPLIED exceptions_applied_ids=${filtered.appliedExceptionIds.join(", ")}`
    );
  }
  if (parsedExceptions.invalid.length > 0) {
    details.push(`exceptions_invalid=${String(parsedExceptions.invalid.length)}`);
    details.push(...parsedExceptions.invalid.slice(0, 10));
    if (parsedExceptions.invalid.length > 10) {
      details.push(
        `exceptions_invalid_truncated=${String(parsedExceptions.invalid.length - 10)}`
      );
    }
  }
  if (filtered.unusedExceptionIds.length > 0) {
    details.push(`exceptions_unused=${String(filtered.unusedExceptionIds.length)}`);
    details.push(
      `UNUSED_ROUTER_PORT_EXCEPTION exceptions_unused_ids=${filtered.unusedExceptionIds.join(", ")}`
    );
  }

  const failureParts = [
    filtered.violations.length > 0
      ? `${String(filtered.violations.length)} unlisted violation(s)`
      : undefined,
    parsedExceptions.invalid.length > 0
      ? `${String(parsedExceptions.invalid.length)} invalid exception entr${parsedExceptions.invalid.length === 1 ? "y" : "ies"}`
      : undefined,
    filtered.unusedExceptionIds.length > 0
      ? `${String(filtered.unusedExceptionIds.length)} stale exception approval(s)`
      : undefined,
    resolvedScope.missing.length > 0
      ? `${String(resolvedScope.missing.length)} missing scan input(s)`
      : undefined,
    collected.scanFailures.length > 0
      ? `${String(collected.scanFailures.length)} unreadable or unparsable scan input(s)`
      : undefined
  ].filter((part) => part !== undefined);

  if (failureParts.length > 0) {
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "fail",
      summary: `UI router port boundary check failed: ${failureParts.join(" and ")} detected.`,
      metric: check.metric,
      details
    };
  }

  return {
    id: check.id,
    owner: check.owner ?? "unknown",
    mode,
    status: "pass",
    summary: `UI router port boundary check passed: ${String(resolvedScope.files.length)} scan input(s), ${String(filtered.appliedExceptionIds.length)} named transitional exception(s) applied.`,
    metric: check.metric,
    details
  };
}
