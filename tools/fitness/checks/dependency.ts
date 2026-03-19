import { readFile } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";

import ts from "typescript";

import { normalizePathToPosix, resolveFilesForScopePatterns } from "../scope.js";
import type { FitnessPolicyCheck, FitnessReportCheck } from "../types.js";

interface ImportEdge {
  from: string;
  to: string;
  line: number;
}

interface DependencyViolation {
  kind: "forbidden_layer_import" | "cycle_detected";
  severity: "fail";
  message: string;
}

const layerImportAllowlist: Record<string, readonly string[]> = {
  domain: ["domain", "shared"],
  application: ["domain", "ports", "shared"],
  "legacy-compat": ["application", "ports", "shared", "legacy-compat"]
};

function layerFromRelativePath(path: string): string | undefined {
  const normalized = normalizePathToPosix(path);
  const match = normalized.match(/^src\/v11\/([^/]+)\//u);
  return match?.[1];
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
        `${fromRelative}:${String(edge.line)} forbidden layer import ${fromLayer} -> ${toLayer}`
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
      const cyclePath = component
        .map((path) => normalizePathToPosix(relative(input.repoRoot, path)))
        .sort((left, right) => left.localeCompare(right))
        .join(" <-> ");
      violations.push({
        kind: "cycle_detected",
        severity: "fail",
        message: `import cycle detected: ${cyclePath}`
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
        `self import cycle detected: ${normalizePathToPosix(relative(input.repoRoot, single))}`
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
      summary: "Dependency check has no configured scope.",
      metric: check.metric,
      details: ["Set scope patterns in tools/fitness/policy.json for dependency check."]
    };
  }

  const files = await resolveFilesForScopePatterns(repoRoot, scope);
  if (files.length === 0) {
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "pass",
      summary: "Dependency check passed: no files matched current scope.",
      metric: check.metric,
      details: [`scope=${scope.join(", ")}`]
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

  const violations = [
    ...detectForbiddenLayerImports({
      repoRoot,
      edges
    }),
    ...detectCycles({
      repoRoot,
      files,
      edges
    })
  ];

  if (violations.length === 0) {
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "pass",
      summary: `Dependency check passed: ${files.length} scoped files scanned with no cycle or forbidden-layer violations.`,
      metric: check.metric,
      details: [
        `scope=${scope.join(", ")}`,
        `files_scanned=${String(files.length)}`,
        `import_edges=${String(edges.length)}`
      ]
    };
  }

  return {
    id: check.id,
    owner: check.owner ?? "unknown",
    mode,
    status: "fail",
    summary: `Dependency check failed: ${String(violations.length)} violation(s) detected (cycles/forbidden-layer imports).`,
    metric: check.metric,
    details: summarizeDependencyViolations(violations)
  };
}
