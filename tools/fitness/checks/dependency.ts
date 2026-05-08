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
    | "forbidden_process_runtime_import"
    | "shared_promotion_single_lane"
    | "shared_lifecycle_policy"
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

type DependencyLayer =
  | "application"
  | "domain"
  | "shared"
  | "ports"
  | "infrastructure"
  | "legacy-compat";

const layerImportAllowlist: Record<DependencyLayer, readonly DependencyLayer[]> = {
  domain: ["domain", "shared"],
  application: ["application", "domain", "shared", "ports"],
  shared: ["domain", "shared", "ports"],
  ports: ["domain", "shared", "ports"],
  infrastructure: ["domain", "shared", "ports", "infrastructure"],
  "legacy-compat": ["application", "shared", "ports", "legacy-compat"]
};

function layerFromRelativePath(path: string): DependencyLayer | undefined {
  const normalized = normalizePathToPosix(path);
  const match = normalized.match(/^src\/v11\/([^/]+)(?:\/|$)/u);
  const layer = match?.[1];
  if (
    layer === "application"
    || layer === "domain"
    || layer === "ports"
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

function parseDependencyExceptions(input: {
  repoRoot: string;
  exceptions: readonly FitnessPolicyException[] | undefined;
}): {
  edgeAllowlist: DependencyEdgeException[];
  cycleAllowlist: DependencyCycleException[];
  invalid: string[];
} {
  const edgeAllowlist: DependencyEdgeException[] = [];
  const cycleAllowlist: DependencyCycleException[] = [];
  const invalid: string[] = [];

  for (const exception of input.exceptions ?? []) {
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
    invalid
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
      ts.isAsExpression(expression)
      || ts.isSatisfiesExpression(expression)
      || ts.isTypeAssertionExpression(expression)
    ) {
      return readStaticStringExpression(expression.expression);
    }
    if (
      ts.isCallExpression(expression)
      && ts.isPropertyAccessExpression(expression.expression)
      && expression.expression.name.text === "join"
      && ts.isArrayLiteralExpression(expression.expression.expression)
      && expression.arguments.length === 1
      && expression.arguments[0] !== undefined
      && ts.isStringLiteral(expression.arguments[0])
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
      ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && node.initializer !== undefined
    ) {
      const value = readStaticStringExpression(node.initializer);
      if (value !== undefined) {
        staticStringBindings.set(node.name.text, value);
      }
    }
    if (
      ts.isFunctionDeclaration(node)
      && node.name !== undefined
      && node.parameters.length === 0
      && node.body !== undefined
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
      ts.isCallExpression(argument)
      && argument.arguments.length === 0
      && ts.isIdentifier(argument.expression)
    ) {
      return staticStringBindings.get(argument.expression.text);
    }
    return readStaticStringExpression(argument);
  };

  const pushSpecifier = (specifier: string, node: ts.Node): void => {
    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
    imports.push({ specifier, line });
  };

  collectStaticStringBindings(sourceFile);

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
      } else if (argument !== undefined && ts.isExpression(argument)) {
        const specifier = resolveDynamicImportSpecifier(argument);
        if (specifier !== undefined) {
          pushSpecifier(specifier, argument);
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
    if (fromLayer !== "shared" && fromLayer !== "ports") {
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

const forbiddenProcessRuntimeSpecifiers = new Set([
  "child_process",
  "cluster",
  "node:child_process",
  "node:cluster",
  "node:worker_threads",
  "worker_threads"
]);

function isProcessRuntimeGuardedPath(relativePath: string): boolean {
  return /^src\/v11\/(?:application|defaults)(?:\/|$)/u.test(relativePath);
}

function detectForbiddenProcessRuntimeImports(input: {
  repoRoot: string;
  files: readonly string[];
  sourceByPath: ReadonlyMap<string, string>;
}): DependencyViolation[] {
  const violations: DependencyViolation[] = [];

  for (const filePath of input.files) {
    const fromRelative = normalizePathToPosix(relative(input.repoRoot, filePath));
    if (!isProcessRuntimeGuardedPath(fromRelative)) {
      continue;
    }

    const sourceText = input.sourceByPath.get(filePath) ?? "";
    const imports = parseImportSpecifiers({
      filePath,
      sourceText
    });

    for (const imported of imports) {
      if (!forbiddenProcessRuntimeSpecifiers.has(imported.specifier)) {
        continue;
      }

      violations.push({
        kind: "forbidden_process_runtime_import",
        severity: "fail",
        message:
          `${fromRelative}:${String(imported.line)} forbidden process runtime import ${imported.specifier}; use a ports capability with infrastructure implementation`,
        fromRelative,
        toRelative: undefined,
        cycleNodes: undefined
      });
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
      (
        /\bfrom\s+["']node:fs(?:\/promises)?["']|\bfrom\s+["']fs(?:\/promises)?["']/u.test(
          sourceText
        )
      ) &&
      /\b(?:readFile|writeFile|appendFile|mkdir|rm|rename|readdir|opendir|copyFile|open|mkdtemp|cp|createReadStream|createWriteStream)\b/u.test(
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
    if (fromLayer !== "shared" && fromLayer !== "ports") {
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

const sharedLifecyclePolicySignalMatchers: readonly {
  signal: string;
  matches: (sourceText: string) => boolean;
}[] = [
  {
    signal: "domain-state-transition-policy",
    matches: (sourceText) =>
      /\bfrom\s+["'][^"']*domain\/state\/machine(?:\.js)?["']/u.test(
        sourceText
      ) || /\bapplyStateTransition\s*\(/u.test(sourceText)
  },
  {
    signal: "transcript-state-persistence-ordering",
    matches: (sourceText) =>
      /\bappendProtocolEnvelope\s*\(/u.test(sourceText)
      && /\bwriteStateSnapshot\s*\(/u.test(sourceText)
  },
  {
    signal: "execution-context-continuation",
    matches: (sourceText) =>
      /\bresolveRuntimeAlignedNextRoundContinuation\s*\(/u.test(sourceText)
  }
] as const;

function isNonPortSharedPath(relativePath: string): boolean {
  return (
    /^src\/v11\/shared(?:\/|$)/u.test(relativePath)
    && !/^src\/v11\/shared\/ports(?:\/|$)/u.test(relativePath)
  );
}

function detectSharedLifecyclePolicyViolations(input: {
  repoRoot: string;
  files: readonly string[];
  sourceByPath: ReadonlyMap<string, string>;
}): DependencyViolation[] {
  const violations: DependencyViolation[] = [];

  for (const filePath of input.files) {
    const fromRelative = normalizePathToPosix(relative(input.repoRoot, filePath));
    if (!isNonPortSharedPath(fromRelative)) {
      continue;
    }

    const sourceText = input.sourceByPath.get(filePath) ?? "";
    const signals = sharedLifecyclePolicySignalMatchers
      .filter(({ matches }) => matches(sourceText))
      .map(({ signal }) => signal);
    if (signals.length === 0) {
      continue;
    }

    violations.push({
      kind: "shared_lifecycle_policy",
      severity: "warn",
      message:
        `${fromRelative}: shared-lifecycle-policy warning: non-port shared module shows lifecycle policy signals (${signals.join(", ")}); keep lifecycle derivation in domain/state and transcript/state persistence workflows in the owning application command`,
      fromRelative,
      toRelative: undefined,
      cycleNodes: undefined
    });
  }

  return violations;
}

interface SharedDirectoryConsumers {
  applicationLanes: Set<string>;
  hasInfrastructureConsumer: boolean;
}

function sharedDirectoryFromRelativePath(path: string): string | undefined {
  const match = path.match(/^src\/v11\/shared\/([^/]+)(?:\/|$)/u);
  const directoryName = match?.[1];
  if (directoryName === undefined || directoryName === "ports") {
    return undefined;
  }
  return directoryName;
}

function applicationLaneFromRelativePath(path: string): string | undefined {
  return path.match(/^src\/v11\/application\/([^/]+)(?:\/|$)/u)?.[1];
}

function detectSharedPromotionViolations(input: {
  repoRoot: string;
  edges: readonly ImportEdge[];
}): DependencyViolation[] {
  const consumersBySharedDirectory = new Map<string, SharedDirectoryConsumers>();

  for (const edge of input.edges) {
    const fromRelative = normalizePathToPosix(relative(input.repoRoot, edge.from));
    const toRelative = normalizePathToPosix(relative(input.repoRoot, edge.to));
    const sharedDirectory = sharedDirectoryFromRelativePath(toRelative);
    if (sharedDirectory === undefined) {
      continue;
    }

    const consumers =
      consumersBySharedDirectory.get(sharedDirectory)
      ?? {
        applicationLanes: new Set<string>(),
        hasInfrastructureConsumer: false
      };
    consumersBySharedDirectory.set(sharedDirectory, consumers);

    const applicationLane = applicationLaneFromRelativePath(fromRelative);
    if (applicationLane !== undefined) {
      consumers.applicationLanes.add(applicationLane);
      continue;
    }

    if (/^src\/v11\/infrastructure(?:\/|$)/u.test(fromRelative)) {
      consumers.hasInfrastructureConsumer = true;
    }
  }

  const violations: DependencyViolation[] = [];
  for (const [sharedDirectory, consumers] of consumersBySharedDirectory) {
    if (
      consumers.hasInfrastructureConsumer
      || consumers.applicationLanes.size !== 1
    ) {
      continue;
    }

    const [applicationLane] = consumers.applicationLanes;
    if (sharedDirectory !== applicationLane) {
      continue;
    }

    violations.push({
      kind: "shared_promotion_single_lane",
      severity: "warn",
      message:
        `src/v11/shared/${sharedDirectory}: shared-promotion warning: command-shaped shared directory imported only by application lane ${applicationLane}; command-local helpers should live under src/v11/application/${applicationLane} or provide explicit multi-lane/infrastructure ownership proof`,
      fromRelative: `src/v11/shared/${sharedDirectory}`,
      toRelative: undefined,
      cycleNodes: undefined
    });
  }

  return violations.sort((left, right) =>
    (left.fromRelative ?? "").localeCompare(right.fromRelative ?? "")
  );
}

function summarizeDependencyViolations(
  violations: readonly DependencyViolation[]
): string[] {
  return violations.slice(0, 50).map((violation) => violation.message);
}

export async function buildDependencyCheckReport({
  check,
  repoRoot,
  fallbackMode
}: {
  check: FitnessPolicyCheck;
  repoRoot: string;
  fallbackMode: string;
}): Promise<FitnessReportCheck> {
  const mode = check.mode ?? fallbackMode;
  const parsedExceptions = parseDependencyExceptions({
    repoRoot,
    exceptions: check.exceptions
  });
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
      "exceptions_applied=0"
    ];
    if (parsedExceptions.invalid.length > 0) {
      details.push(`exceptions_invalid=${String(parsedExceptions.invalid.length)}`);
      details.push(...parsedExceptions.invalid.slice(0, 10));
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
  const availableFiles: string[] = [];
  for (const path of files) {
    try {
      sourceByPath.set(path, await readFile(path, "utf8"));
      availableFiles.push(path);
    } catch (error) {
      if (
        typeof error === "object"
        && error !== null
        && "code" in error
        && error.code === "ENOENT"
      ) {
        continue;
      }
      throw error;
    }
  }

  const edges = buildImportEdges({
    repoRoot,
    files: availableFiles,
    sourceByPath
  });

  const allViolations = [
    ...detectForbiddenLayerImports({
      repoRoot,
      edges
    }),
    ...detectAntiCircumventionViolations({
      repoRoot,
      files: availableFiles,
      sourceByPath
    }),
    ...detectForbiddenProcessRuntimeImports({
      repoRoot,
      files: availableFiles,
      sourceByPath
    }),
    ...detectOwnershipSignalViolations({
      repoRoot,
      files: availableFiles,
      sourceByPath
    }),
    ...detectSharedLifecyclePolicyViolations({
      repoRoot,
      files: availableFiles,
      sourceByPath
    }),
    ...detectSharedPromotionViolations({
      repoRoot,
      edges
    }),
    ...detectCycles({
      repoRoot,
      files: availableFiles,
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
      `files_scanned=${String(availableFiles.length)}`,
      `import_edges=${String(edges.length)}`,
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
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "pass",
      summary: `Dependency check passed: ${availableFiles.length} scoped files scanned with no dependency violations.`,
      metric: check.metric,
      details
    };
  }

  const details = summarizeDependencyViolations(violations);
  details.push(`exceptions_configured=${String(check.exceptions?.length ?? 0)}`);
  details.push(`exceptions_applied=${String(filtered.appliedExceptionIds.length)}`);
  if (parsedExceptions.invalid.length > 0) {
    details.push(`exceptions_invalid=${String(parsedExceptions.invalid.length)}`);
    details.push(...parsedExceptions.invalid.slice(0, 10));
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
        ? `Dependency check failed: ${String(failViolations.length)} dependency violation(s) detected.`
        : `Dependency check failed: ${String(failViolations.length)} fail violation(s) and ${String(warnViolations.length)} warning(s) detected.`,
    metric: check.metric,
    details
  };
}
