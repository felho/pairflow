import { readFile } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";

import ts from "typescript";

import { normalizePathToPosix, resolveFilesForScopePatterns } from "../scope.js";
import type {
  FitnessPolicyCheck,
  FitnessPolicyException,
  FitnessReportCheck
} from "../types.js";

interface ImportEdge {
  from: string;
  to: string;
  line: number;
}

interface DependencyViolation {
  kind:
    | "forbidden_layer_import"
    | "cycle_detected"
    | "anti_circumvention_reexport"
    | "anti_circumvention_wrapper"
    | "ownership_signal_shared_infra";
  severity: "fail" | "warn";
  message: string;
  fromRelative: string | undefined;
  toRelative: string | undefined;
  cycleNodes: string[] | undefined;
}

interface DependencyEdgeException {
  id: string;
  from: string;
  to: string;
}

interface DependencyCycleException {
  id: string;
  paths: string[];
}

interface ExceptionLifecycleStatus {
  expiredIds: string[];
  invalidLifecycle: string[];
  currentMilestone: string | undefined;
}

type DependencyLayer =
  | "application"
  | "domain"
  | "shared"
  | "shared-ports"
  | "infrastructure"
  | "legacy-compat";

const layerImportAllowlist: Record<DependencyLayer, readonly DependencyLayer[]> = {
  domain: ["domain", "shared"],
  application: ["application", "domain", "shared", "shared-ports"],
  shared: ["domain", "shared", "shared-ports"],
  "shared-ports": ["domain", "shared", "shared-ports"],
  infrastructure: ["domain", "shared", "shared-ports", "infrastructure"],
  "legacy-compat": ["application", "shared", "shared-ports", "legacy-compat"]
};

function layerFromRelativePath(path: string): DependencyLayer | undefined {
  const normalized = normalizePathToPosix(path);
  if (/^src\/v11\/shared\/ports(?:\/|$)/u.test(normalized)) {
    return "shared-ports";
  }
  const match = normalized.match(/^src\/v11\/([^/]+)(?:\/|$)/u);
  const layer = match?.[1];
  if (
    layer === "application"
    || layer === "domain"
    || layer === "shared"
    || layer === "infrastructure"
    || layer === "legacy-compat"
  ) {
    return layer;
  }
  return undefined;
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

function cycleKey(paths: readonly string[]): string {
  return [...paths].sort((left, right) => left.localeCompare(right)).join(" <-> ");
}

function parseMilestoneOrdinal(raw: string): number | undefined {
  const normalized = raw.trim().toUpperCase();
  const match = normalized.match(/^M([0-9]+)$/u);
  if (match === null) {
    return undefined;
  }
  return Number.parseInt(match[1] ?? "", 10);
}

function resolveLifecycleMode(input: {
  lifecycleMode: string | undefined;
  checkMode: string;
}): "report-only" | "soft-fail" | "hard-fail" {
  const candidate = (input.lifecycleMode ?? input.checkMode).toLowerCase();
  if (candidate === "hard-fail") {
    return "hard-fail";
  }
  if (candidate === "soft-fail") {
    return "soft-fail";
  }
  return "report-only";
}

function parseDependencyExceptions(input: {
  repoRoot: string;
  exceptions: readonly FitnessPolicyException[] | undefined;
  currentMilestone: string | undefined;
}): {
  edgeAllowlist: DependencyEdgeException[];
  cycleAllowlist: DependencyCycleException[];
  invalid: string[];
  lifecycle: ExceptionLifecycleStatus;
} {
  const edgeAllowlist: DependencyEdgeException[] = [];
  const cycleAllowlist: DependencyCycleException[] = [];
  const invalid: string[] = [];
  const expiredIds = new Set<string>();
  const invalidLifecycle = new Set<string>();
  const currentMilestoneOrdinal =
    input.currentMilestone === undefined
      ? undefined
      : parseMilestoneOrdinal(input.currentMilestone);

  if (
    input.currentMilestone !== undefined
    && currentMilestoneOrdinal === undefined
    && (input.exceptions?.length ?? 0) > 0
  ) {
    invalidLifecycle.add(
      `invalid current milestone format: ${input.currentMilestone} (expected M<number>)`
    );
  }

  for (const exception of input.exceptions ?? []) {
    const expiryOrdinal = parseMilestoneOrdinal(exception.expires_milestone);
    if (expiryOrdinal === undefined) {
      invalidLifecycle.add(
        `exception ${exception.id}: invalid expires_milestone "${exception.expires_milestone}" (expected M<number>)`
      );
    } else if (
      currentMilestoneOrdinal !== undefined
      && currentMilestoneOrdinal > expiryOrdinal
    ) {
      expiredIds.add(exception.id);
    }

    if (exception.kind === "allow-edge") {
      if (exception.from === undefined || exception.to === undefined) {
        invalid.push(
          `exception ${exception.id}: allow-edge requires from/to fields`
        );
        continue;
      }
      edgeAllowlist.push({
        id: exception.id,
        from: normalizeRelativePolicyPath(exception.from, input.repoRoot),
        to: normalizeRelativePolicyPath(exception.to, input.repoRoot)
      });
      continue;
    }

    if (exception.kind === "allow-cycle") {
      if (exception.paths === undefined || exception.paths.length === 0) {
        invalid.push(
          `exception ${exception.id}: allow-cycle requires non-empty paths field`
        );
        continue;
      }
      cycleAllowlist.push({
        id: exception.id,
        paths: exception.paths.map((path) =>
          normalizeRelativePolicyPath(path, input.repoRoot)
        )
      });
      continue;
    }

    invalid.push(
      `exception ${exception.id}: unsupported dependency exception kind "${exception.kind}"`
    );
  }

  return {
    edgeAllowlist,
    cycleAllowlist,
    invalid,
    lifecycle: {
      expiredIds: [...expiredIds].sort((left, right) => left.localeCompare(right)),
      invalidLifecycle: [...invalidLifecycle].sort((left, right) =>
        left.localeCompare(right)
      ),
      currentMilestone: input.currentMilestone
    }
  };
}

function filterDependencyViolationsByExceptions(input: {
  violations: readonly DependencyViolation[];
  edgeAllowlist: readonly DependencyEdgeException[];
  cycleAllowlist: readonly DependencyCycleException[];
}): {
  violations: DependencyViolation[];
  appliedExceptionIds: string[];
} {
  const appliedExceptionIds = new Set<string>();
  const remainingViolations: DependencyViolation[] = [];

  for (const violation of input.violations) {
    if (
      violation.kind === "forbidden_layer_import"
      && violation.fromRelative !== undefined
      && violation.toRelative !== undefined
    ) {
      const match = input.edgeAllowlist.find(
        (exception) =>
          exception.from === violation.fromRelative
          && exception.to === violation.toRelative
      );
      if (match !== undefined) {
        appliedExceptionIds.add(match.id);
        continue;
      }
    }

    if (violation.kind === "cycle_detected" && violation.cycleNodes !== undefined) {
      const violationCycleKey = cycleKey(violation.cycleNodes);
      const match = input.cycleAllowlist.find(
        (exception) => cycleKey(exception.paths) === violationCycleKey
      );
      if (match !== undefined) {
        appliedExceptionIds.add(match.id);
        continue;
      }
    }

    remainingViolations.push(violation);
  }

  return {
    violations: remainingViolations,
    appliedExceptionIds: [...appliedExceptionIds].sort((left, right) =>
      left.localeCompare(right)
    )
  };
}

function parseImportSpecifiers(input: {
  filePath: string;
  sourceText: string;
}): { specifier: string; line: number }[] {
  const sourceFile = ts.createSourceFile(
    input.filePath,
    input.sourceText,
    ts.ScriptTarget.Latest,
    true
  );
  const imports: { specifier: string; line: number }[] = [];

  const pushSpecifier = (specifier: string, node: ts.Node): void => {
    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
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
  const { importerPath, specifier, knownFiles } = input;
  if (!specifier.startsWith(".")) {
    return undefined;
  }

  const importerDir = dirname(importerPath);
  const rawTarget = resolve(importerDir, specifier);
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
    if (knownFiles.has(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

function buildImportEdges(input: {
  repoRoot: string;
  files: readonly string[];
  sourceByPath: ReadonlyMap<string, string>;
}): ImportEdge[] {
  const { files, sourceByPath } = input;
  const knownFiles = new Set(files);
  const edges: ImportEdge[] = [];

  for (const filePath of files) {
    const sourceText = sourceByPath.get(filePath) ?? "";
    const imports = parseImportSpecifiers({
      filePath,
      sourceText
    });
    for (const imported of imports) {
      const target = resolveRelativeImportTarget({
        importerPath: filePath,
        specifier: imported.specifier,
        knownFiles
      });
      if (target === undefined) {
        continue;
      }
      edges.push({
        from: filePath,
        to: target,
        line: imported.line
      });
    }
  }
  return edges;
}

function detectForbiddenLayerImports(input: {
  repoRoot: string;
  edges: readonly ImportEdge[];
}): DependencyViolation[] {
  const violations: DependencyViolation[] = [];
  for (const edge of input.edges) {
    const fromRelative = normalizePathToPosix(relative(input.repoRoot, edge.from));
    const toRelative = normalizePathToPosix(relative(input.repoRoot, edge.to));
    const fromLayer = layerFromRelativePath(fromRelative);
    const toLayer = layerFromRelativePath(toRelative);
    if (fromLayer === undefined || toLayer === undefined) {
      continue;
    }
    const allowedTargets = layerImportAllowlist[fromLayer];
    if (allowedTargets === undefined) {
      continue;
    }
    if (allowedTargets.includes(toLayer)) {
      continue;
    }
    violations.push({
      kind: "forbidden_layer_import",
      severity: "fail",
      message:
        `${fromRelative}:${String(edge.line)} forbidden layer import ${fromLayer} -> ${toLayer}`,
      fromRelative,
      toRelative,
      cycleNodes: undefined
    });
  }
  return violations;
}

function detectCycles(input: {
  repoRoot: string;
  files: readonly string[];
  edges: readonly ImportEdge[];
}): DependencyViolation[] {
  const adjacency = new Map<string, Set<string>>();
  for (const file of input.files) {
    adjacency.set(file, new Set());
  }
  for (const edge of input.edges) {
    const neighbors = adjacency.get(edge.from);
    if (neighbors !== undefined) {
      neighbors.add(edge.to);
    }
  }

  const indexMap = new Map<string, number>();
  const lowMap = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  let index = 0;
  const stronglyConnectedComponents: string[][] = [];

  const strongConnect = (node: string): void => {
    indexMap.set(node, index);
    lowMap.set(node, index);
    index += 1;
    stack.push(node);
    onStack.add(node);

    for (const neighbor of adjacency.get(node) ?? []) {
      if (!indexMap.has(neighbor)) {
        strongConnect(neighbor);
        lowMap.set(node, Math.min(lowMap.get(node) ?? 0, lowMap.get(neighbor) ?? 0));
      } else if (onStack.has(neighbor)) {
        lowMap.set(node, Math.min(lowMap.get(node) ?? 0, indexMap.get(neighbor) ?? 0));
      }
    }

    if ((lowMap.get(node) ?? -1) !== (indexMap.get(node) ?? -2)) {
      return;
    }

    const component: string[] = [];
    while (stack.length > 0) {
      const top = stack.pop();
      if (top === undefined) {
        break;
      }
      onStack.delete(top);
      component.push(top);
      if (top === node) {
        break;
      }
    }
    stronglyConnectedComponents.push(component);
  };

  for (const node of adjacency.keys()) {
    if (!indexMap.has(node)) {
      strongConnect(node);
    }
  }

  const violations: DependencyViolation[] = [];
  for (const component of stronglyConnectedComponents) {
    if (component.length > 1) {
      const cycleNodes = component
        .map((path) => normalizePathToPosix(relative(input.repoRoot, path)))
        .sort((left, right) => left.localeCompare(right));
      violations.push({
        kind: "cycle_detected",
        severity: "fail",
        message: `import cycle detected: ${cycleNodes.join(" <-> ")}`,
        fromRelative: undefined,
        toRelative: undefined,
        cycleNodes
      });
      continue;
    }

    const single = component[0];
    if (single === undefined) {
      continue;
    }
    const hasSelfLoop = adjacency.get(single)?.has(single) ?? false;
    if (!hasSelfLoop) {
      continue;
    }
    violations.push({
      kind: "cycle_detected",
      severity: "fail",
      message:
        `self import cycle detected: ${normalizePathToPosix(relative(input.repoRoot, single))}`,
      fromRelative: undefined,
      toRelative: undefined,
      cycleNodes: [normalizePathToPosix(relative(input.repoRoot, single))]
    });
  }

  return violations;
}

function getImportBindingNames(clause: ts.ImportClause): string[] {
  const names: string[] = [];
  if (clause.name !== undefined) {
    names.push(clause.name.text);
  }
  if (clause.namedBindings === undefined) {
    return names;
  }
  if (ts.isNamespaceImport(clause.namedBindings)) {
    names.push(clause.namedBindings.name.text);
    return names;
  }
  for (const element of clause.namedBindings.elements) {
    names.push(element.name.text);
  }
  return names;
}

function isDirectInfraForwarderExpression(
  expression: ts.Expression,
  importedBindings: ReadonlySet<string>
): boolean {
  const unwrapped = ts.isParenthesizedExpression(expression)
    ? expression.expression
    : expression;

  if (ts.isIdentifier(unwrapped)) {
    return importedBindings.has(unwrapped.text);
  }

  if (ts.isArrowFunction(unwrapped) || ts.isFunctionExpression(unwrapped)) {
    const body = unwrapped.body;
    if (ts.isCallExpression(body) && ts.isIdentifier(body.expression)) {
      return importedBindings.has(body.expression.text);
    }
    if (ts.isBlock(body) && body.statements.length === 1) {
      const onlyStatement = body.statements[0];
      if (onlyStatement === undefined) {
        return false;
      }
      if (
        ts.isReturnStatement(onlyStatement)
        && onlyStatement.expression !== undefined
        && ts.isCallExpression(onlyStatement.expression)
        && ts.isIdentifier(onlyStatement.expression.expression)
      ) {
        return importedBindings.has(onlyStatement.expression.expression.text);
      }
    }
  }

  return false;
}

function detectAntiCircumventionViolations(input: {
  repoRoot: string;
  files: readonly string[];
  sourceByPath: ReadonlyMap<string, string>;
}): DependencyViolation[] {
  const knownFiles = new Set(input.files);
  const violations: DependencyViolation[] = [];

  for (const filePath of input.files) {
    const fromRelative = normalizePathToPosix(relative(input.repoRoot, filePath));
    const fromLayer = layerFromRelativePath(fromRelative);
    if (fromLayer !== "shared" && fromLayer !== "shared-ports") {
      continue;
    }

    const sourceText = input.sourceByPath.get(filePath) ?? "";
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true
    );
    const importedInfraBindings = new Set<string>();
    const topLevelForwarderStatements = new Set<ts.Statement>();
    let hasMeaningfulNonForwarderStatement = false;

    for (const statement of sourceFile.statements) {
      if (ts.isImportDeclaration(statement)) {
        if (
          statement.importClause === undefined
          || !ts.isStringLiteral(statement.moduleSpecifier)
        ) {
          continue;
        }
        const target = resolveRelativeImportTarget({
          importerPath: filePath,
          specifier: statement.moduleSpecifier.text,
          knownFiles
        });
        if (target === undefined) {
          continue;
        }
        const toRelative = normalizePathToPosix(relative(input.repoRoot, target));
        if (layerFromRelativePath(toRelative) !== "infrastructure") {
          continue;
        }
        for (const bindingName of getImportBindingNames(statement.importClause)) {
          importedInfraBindings.add(bindingName);
        }
        continue;
      }

      if (
        ts.isExportDeclaration(statement)
        && statement.moduleSpecifier !== undefined
        && ts.isStringLiteral(statement.moduleSpecifier)
      ) {
        const target = resolveRelativeImportTarget({
          importerPath: filePath,
          specifier: statement.moduleSpecifier.text,
          knownFiles
        });
        if (target === undefined) {
          continue;
        }
        const toRelative = normalizePathToPosix(relative(input.repoRoot, target));
        if (layerFromRelativePath(toRelative) !== "infrastructure") {
          continue;
        }
        const line =
          sourceFile.getLineAndCharacterOfPosition(statement.getStart(sourceFile)).line + 1;
        violations.push({
          kind: "anti_circumvention_reexport",
          severity: "fail",
          message:
            `${fromRelative}:${String(line)} anti-circumvention: ${fromLayer} re-exports infrastructure module ${toRelative}`,
          fromRelative,
          toRelative,
          cycleNodes: undefined
        });
        continue;
      }
    }

    if (importedInfraBindings.size === 0) {
      continue;
    }

    for (const statement of sourceFile.statements) {
      if (ts.isImportDeclaration(statement)) {
        continue;
      }

      if (
        ts.isExportDeclaration(statement)
        && statement.moduleSpecifier === undefined
        && statement.exportClause !== undefined
        && ts.isNamedExports(statement.exportClause)
      ) {
        const isForwarder = statement.exportClause.elements.every((element) =>
          importedInfraBindings.has((element.propertyName ?? element.name).text)
        );
        if (isForwarder) {
          topLevelForwarderStatements.add(statement);
          continue;
        }
      }

      if (ts.isVariableStatement(statement)) {
        const isExported = statement.modifiers?.some(
          (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
        ) ?? false;
        if (!isExported) {
          hasMeaningfulNonForwarderStatement = true;
          continue;
        }
        const allForwarders = statement.declarationList.declarations.every(
          (declaration) =>
            declaration.initializer !== undefined
            && isDirectInfraForwarderExpression(
              declaration.initializer,
              importedInfraBindings
            )
        );
        if (allForwarders) {
          topLevelForwarderStatements.add(statement);
          continue;
        }
      }

      if (
        (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement))
        && (statement.modifiers?.some(
          (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
        ) ?? false)
      ) {
        hasMeaningfulNonForwarderStatement = true;
        continue;
      }

      hasMeaningfulNonForwarderStatement = true;
    }

    if (
      topLevelForwarderStatements.size > 0
      && !hasMeaningfulNonForwarderStatement
    ) {
      for (const statement of topLevelForwarderStatements) {
        const line =
          sourceFile.getLineAndCharacterOfPosition(statement.getStart(sourceFile)).line + 1;
        violations.push({
          kind: "anti_circumvention_wrapper",
          severity: "fail",
          message:
            `${fromRelative}:${String(line)} anti-circumvention: ${fromLayer} acts as a thin forwarding wrapper over infrastructure imports`,
          fromRelative,
          toRelative: undefined,
          cycleNodes: undefined
        });
      }
    }
  }

  return violations;
}

const ownershipSignalMatchers: readonly {
  signal: string;
  matches: (sourceText: string) => boolean;
}[] = [
  {
    signal: "filesystem-persistence",
    matches: (sourceText) =>
      /\bfrom\s+["']node:fs(?:\/promises)?["']|\bfrom\s+["']fs(?:\/promises)?["']/u.test(
        sourceText
      )
  },
  {
    signal: "child-process-execution",
    matches: (sourceText) =>
      /\bfrom\s+["']node:child_process["']|\bfrom\s+["']child_process["']/u.test(
        sourceText
      )
  },
  {
    signal: "state-persistence",
    matches: (sourceText) =>
      /\bfrom\s+["'][^"']*(?:core\/state\/stateStore|v11\/infrastructure\/state\/stateStore)[^"']*["']/u.test(
        sourceText
      ) && /\bwriteStateSnapshot\s*\(/u.test(sourceText)
  },
  {
    signal: "transcript-persistence",
    matches: (sourceText) =>
      /\bfrom\s+["'][^"']*(?:core\/protocol\/transcriptStore|v11\/infrastructure\/artifact\/transcript)[^"']*["']/u.test(
        sourceText
      ) && /\bappendProtocolEnvelope\s*\(/u.test(sourceText)
  },
  {
    signal: "tmux-runtime",
    matches: (sourceText) =>
      /\bfrom\s+["'][^"']*(?:core\/runtime\/tmux|v11\/infrastructure\/channel\/tmux)[^"']*["']|\b(?:emitTmuxDeliveryNotification|resolveDeliveryMessageRef|respawnTmuxPaneCommand|runInTmuxPane|runTmuxAttach|checkSession)\s*\(/u.test(
        sourceText
      )
  }
] as const;

function detectOwnershipSignalViolations(input: {
  repoRoot: string;
  files: readonly string[];
  sourceByPath: ReadonlyMap<string, string>;
}): DependencyViolation[] {
  const violations: DependencyViolation[] = [];

  for (const filePath of input.files) {
    const fromRelative = normalizePathToPosix(relative(input.repoRoot, filePath));
    const fromLayer = layerFromRelativePath(fromRelative);
    if (fromLayer !== "shared" && fromLayer !== "shared-ports") {
      continue;
    }

    const sourceText = input.sourceByPath.get(filePath) ?? "";
    const signals = ownershipSignalMatchers
      .filter(({ matches }) => matches(sourceText))
      .map(({ signal }) => signal);
    if (signals.length === 0) {
      continue;
    }

    violations.push({
      kind: "ownership_signal_shared_infra",
      severity: "warn",
      message:
        `${fromRelative}: ownership-signal warning: ${fromLayer} module shows strong infrastructure signals (${signals.join(", ")})`,
      fromRelative,
      toRelative: undefined,
      cycleNodes: undefined
    });
  }

  return violations;
}

function summarizeDependencyViolations(
  violations: readonly DependencyViolation[]
): string[] {
  return violations.slice(0, 50).map((violation) => violation.message);
}

export async function buildDependencyCheckReport({
  check,
  repoRoot,
  fallbackMode,
  currentMilestone
}: {
  check: FitnessPolicyCheck;
  repoRoot: string;
  fallbackMode: string;
  currentMilestone: string | undefined;
}): Promise<FitnessReportCheck> {
  const mode = check.mode ?? fallbackMode;
  const lifecycleMode = resolveLifecycleMode({
    lifecycleMode: check.exception_lifecycle_mode,
    checkMode: mode
  });
  const parsedExceptions = parseDependencyExceptions({
    repoRoot,
    exceptions: check.exceptions,
    currentMilestone
  });
  const lifecycleWarnCount =
    parsedExceptions.lifecycle.expiredIds.length
    + parsedExceptions.lifecycle.invalidLifecycle.length;
  const scope = check.scope ?? [];
  if (scope.length === 0) {
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "warn",
      summary: "Dependency check has no configured scope.",
      metric: check.metric,
      details: ["Set scope patterns in tools/fitness/policy.json for dependency check."]
    };
  }

  const files = await resolveFilesForScopePatterns(repoRoot, scope);
  if (files.length === 0) {
    const details = [
      `scope=${scope.join(", ")}`,
      "files_scanned=0",
      `exceptions_configured=${String(check.exceptions?.length ?? 0)}`,
      "exceptions_applied=0",
      `exception_lifecycle_mode=${lifecycleMode}`
    ];
    if (parsedExceptions.lifecycle.currentMilestone !== undefined) {
      details.push(`current_milestone=${parsedExceptions.lifecycle.currentMilestone}`);
    }
    if (parsedExceptions.invalid.length > 0) {
      details.push(`exceptions_invalid=${String(parsedExceptions.invalid.length)}`);
      details.push(...parsedExceptions.invalid.slice(0, 10));
    }
    if (parsedExceptions.lifecycle.expiredIds.length > 0) {
      details.push(
        `exceptions_expired=${String(parsedExceptions.lifecycle.expiredIds.length)}`
      );
      details.push(
        `exceptions_expired_ids=${parsedExceptions.lifecycle.expiredIds.join(", ")}`
      );
    }
    if (parsedExceptions.lifecycle.invalidLifecycle.length > 0) {
      details.push(
        `exceptions_lifecycle_invalid=${String(parsedExceptions.lifecycle.invalidLifecycle.length)}`
      );
      details.push(...parsedExceptions.lifecycle.invalidLifecycle.slice(0, 10));
    }

    if (lifecycleWarnCount > 0) {
      if (lifecycleMode === "hard-fail") {
        return {
          id: check.id,
          owner: check.owner ?? "unknown",
          mode: lifecycleMode,
          status: "fail",
          summary:
            `Dependency check blocked: ${String(lifecycleWarnCount)} exception lifecycle violation(s) detected under hard-fail mode (0 scoped files).`,
          metric: check.metric,
          details
        };
      }
      return {
        id: check.id,
        owner: check.owner ?? "unknown",
        mode: lifecycleMode,
        status: "warn",
        summary:
          `Dependency check warning: no scoped files matched, but ${String(lifecycleWarnCount)} exception lifecycle warning(s) detected (${lifecycleMode}).`,
        metric: check.metric,
        details
      };
    }

    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "pass",
      summary: "Dependency check passed: no files matched current scope.",
      metric: check.metric,
      details
    };
  }

  const sourceByPath = new Map<string, string>();
  for (const path of files) {
    sourceByPath.set(path, await readFile(path, "utf8"));
  }

  const edges = buildImportEdges({
    repoRoot,
    files,
    sourceByPath
  });

  const allViolations = [
    ...detectForbiddenLayerImports({
      repoRoot,
      edges
    }),
    ...detectAntiCircumventionViolations({
      repoRoot,
      files,
      sourceByPath
    }),
    ...detectOwnershipSignalViolations({
      repoRoot,
      files,
      sourceByPath
    }),
    ...detectCycles({
      repoRoot,
      files,
      edges
    })
  ];
  const filtered = filterDependencyViolationsByExceptions({
    violations: allViolations,
    edgeAllowlist: parsedExceptions.edgeAllowlist,
    cycleAllowlist: parsedExceptions.cycleAllowlist
  });
  const violations = filtered.violations;
  const failViolations = violations.filter((violation) => violation.severity === "fail");
  const warnViolations = violations.filter((violation) => violation.severity === "warn");

  if (failViolations.length === 0 && warnViolations.length === 0) {
    const details = [
      `scope=${scope.join(", ")}`,
      `files_scanned=${String(files.length)}`,
      `import_edges=${String(edges.length)}`,
      `exceptions_configured=${String(check.exceptions?.length ?? 0)}`,
      `exceptions_applied=${String(filtered.appliedExceptionIds.length)}`,
      `exception_lifecycle_mode=${lifecycleMode}`
    ];
    if (parsedExceptions.lifecycle.currentMilestone !== undefined) {
      details.push(`current_milestone=${parsedExceptions.lifecycle.currentMilestone}`);
    }
    if (parsedExceptions.invalid.length > 0) {
      details.push(`exceptions_invalid=${String(parsedExceptions.invalid.length)}`);
      details.push(...parsedExceptions.invalid.slice(0, 10));
    }
    if (parsedExceptions.lifecycle.expiredIds.length > 0) {
      details.push(
        `exceptions_expired=${String(parsedExceptions.lifecycle.expiredIds.length)}`
      );
      details.push(
        `exceptions_expired_ids=${parsedExceptions.lifecycle.expiredIds.join(", ")}`
      );
    }
    if (parsedExceptions.lifecycle.invalidLifecycle.length > 0) {
      details.push(
        `exceptions_lifecycle_invalid=${String(parsedExceptions.lifecycle.invalidLifecycle.length)}`
      );
      details.push(...parsedExceptions.lifecycle.invalidLifecycle.slice(0, 10));
    }
    if (filtered.appliedExceptionIds.length > 0) {
      details.push(
        `exceptions_applied_ids=${filtered.appliedExceptionIds.join(", ")}`
      );
    }
    if (lifecycleWarnCount > 0) {
      if (lifecycleMode === "hard-fail") {
        return {
          id: check.id,
          owner: check.owner ?? "unknown",
          mode: lifecycleMode,
          status: "fail",
          summary:
            `Dependency check blocked: ${String(lifecycleWarnCount)} exception lifecycle violation(s) detected under hard-fail mode.`,
          metric: check.metric,
          details
        };
      }
      return {
        id: check.id,
        owner: check.owner ?? "unknown",
        mode: lifecycleMode,
        status: "warn",
        summary:
          `Dependency check warning: no active cycle/layer violations, but ${String(lifecycleWarnCount)} exception lifecycle warning(s) detected (${lifecycleMode}).`,
        metric: check.metric,
        details
      };
    }
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "pass",
      summary: `Dependency check passed: ${files.length} scoped files scanned with no cycle or forbidden-layer violations.`,
      metric: check.metric,
      details
    };
  }

  const details = summarizeDependencyViolations(violations);
  details.push(`exceptions_configured=${String(check.exceptions?.length ?? 0)}`);
  details.push(`exceptions_applied=${String(filtered.appliedExceptionIds.length)}`);
  details.push(`exception_lifecycle_mode=${lifecycleMode}`);
  if (parsedExceptions.lifecycle.currentMilestone !== undefined) {
    details.push(`current_milestone=${parsedExceptions.lifecycle.currentMilestone}`);
  }
  if (parsedExceptions.invalid.length > 0) {
    details.push(`exceptions_invalid=${String(parsedExceptions.invalid.length)}`);
    details.push(...parsedExceptions.invalid.slice(0, 10));
  }
  if (parsedExceptions.lifecycle.expiredIds.length > 0) {
    details.push(
      `exceptions_expired=${String(parsedExceptions.lifecycle.expiredIds.length)}`
    );
    details.push(
      `exceptions_expired_ids=${parsedExceptions.lifecycle.expiredIds.join(", ")}`
    );
  }
  if (parsedExceptions.lifecycle.invalidLifecycle.length > 0) {
    details.push(
      `exceptions_lifecycle_invalid=${String(parsedExceptions.lifecycle.invalidLifecycle.length)}`
    );
    details.push(...parsedExceptions.lifecycle.invalidLifecycle.slice(0, 10));
  }
  if (filtered.appliedExceptionIds.length > 0) {
    details.push(`exceptions_applied_ids=${filtered.appliedExceptionIds.join(", ")}`);
  }

  if (failViolations.length === 0) {
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "warn",
      summary: `Dependency check warning: ${String(warnViolations.length)} report-only ownership/circumvention warning(s) detected.`,
      metric: check.metric,
      details
    };
  }

  return {
    id: check.id,
    owner: check.owner ?? "unknown",
    mode,
    status: "fail",
    summary:
      failViolations.length === violations.length
        ? `Dependency check failed: ${String(failViolations.length)} violation(s) detected (cycles/forbidden-layer imports).`
        : `Dependency check failed: ${String(failViolations.length)} fail violation(s) and ${String(warnViolations.length)} warning(s) detected.`,
    metric: check.metric,
    details
  };
}
