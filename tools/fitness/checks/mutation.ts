import { readFile } from "node:fs/promises";
import { relative } from "node:path";
import ts from "typescript";

import { normalizePathToPosix, resolveFilesForScopePatterns } from "../scope.js";
import type { FitnessPolicyCheck, FitnessReportCheck } from "../types.js";

interface MutationViolation {
  path: string;
  line: number;
  severity: "fail" | "warn";
  kind: "state_before_transcript" | "state_without_transcript";
  snippet: string;
}

interface MutationCallSite {
  line: number;
  snippet: string;
}

interface MutationSourceAnalysis {
  appendLines: number[];
  statePersistCalls: MutationCallSite[];
}

interface StatePersistAnalysis {
  analyzable: boolean;
  hasLifecycleMutation: boolean;
  hasNonLifecycleMutation: boolean;
}

interface SourceAnalysisContext {
  sourceFile: ts.SourceFile;
  lines: readonly string[];
  variableDeclarations: Map<string, ts.VariableDeclaration[]>;
}

const lifecycleStateFields = new Set(["state", "round", "active_agent", "active_role", "active_since"]);

const unknownPersistAnalysis: StatePersistAnalysis = {
  analyzable: false,
  hasLifecycleMutation: false,
  hasNonLifecycleMutation: false
};

function getCallExpressionName(expression: ts.LeftHandSideExpression): string | null {
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }
  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text;
  }
  if (
    ts.isElementAccessExpression(expression) &&
    expression.argumentExpression !== undefined &&
    ts.isStringLiteralLike(expression.argumentExpression)
  ) {
    return expression.argumentExpression.text;
  }
  return null;
}

function getPropertyNameText(name: ts.PropertyName): string | null {
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return null;
}

function createSourceAnalysisContext(filePath: string, fileContent: string): SourceAnalysisContext {
  const sourceFile = ts.createSourceFile(filePath, fileContent, ts.ScriptTarget.Latest, true);
  const lines = fileContent.split(/\r?\n/u);
  const variableDeclarations = new Map<string, ts.VariableDeclaration[]>();

  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      const existing = variableDeclarations.get(node.name.text);
      if (existing) {
        existing.push(node);
      } else {
        variableDeclarations.set(node.name.text, [node]);
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return { sourceFile, lines, variableDeclarations };
}

function resolveVariableInitializer(
  name: string,
  beforePosition: number,
  context: SourceAnalysisContext
): ts.Expression | undefined {
  const declarations = context.variableDeclarations.get(name);
  if (!declarations || declarations.length === 0) {
    return undefined;
  }

  for (let index = declarations.length - 1; index >= 0; index -= 1) {
    const declaration = declarations[index];
    if (!declaration) {
      continue;
    }
    if (declaration.getStart(context.sourceFile) >= beforePosition) {
      continue;
    }
    if (declaration.initializer) {
      return declaration.initializer;
    }
  }

  return undefined;
}

function analyzeObjectLiteralStateMutation(objectLiteral: ts.ObjectLiteralExpression): StatePersistAnalysis {
  let hasLifecycleMutation = false;
  let hasNonLifecycleMutation = false;
  let hasUnknownMutation = false;

  for (const property of objectLiteral.properties) {
    if (ts.isSpreadAssignment(property)) {
      continue;
    }

    if (
      ts.isPropertyAssignment(property) ||
      ts.isShorthandPropertyAssignment(property) ||
      ts.isMethodDeclaration(property) ||
      ts.isGetAccessorDeclaration(property) ||
      ts.isSetAccessorDeclaration(property)
    ) {
      const fieldName = getPropertyNameText(property.name);
      if (fieldName === null) {
        hasUnknownMutation = true;
        continue;
      }
      if (lifecycleStateFields.has(fieldName)) {
        hasLifecycleMutation = true;
      } else {
        hasNonLifecycleMutation = true;
      }
      continue;
    }

    hasUnknownMutation = true;
  }

  if (hasUnknownMutation) {
    return unknownPersistAnalysis;
  }

  return {
    analyzable: true,
    hasLifecycleMutation,
    hasNonLifecycleMutation
  };
}

function analyzePersistedStateExpression(
  expression: ts.Expression,
  context: SourceAnalysisContext,
  beforePosition: number,
  visited: Set<number> = new Set()
): StatePersistAnalysis {
  if (visited.has(expression.pos)) {
    return unknownPersistAnalysis;
  }
  visited.add(expression.pos);

  if (ts.isParenthesizedExpression(expression)) {
    return analyzePersistedStateExpression(expression.expression, context, beforePosition, visited);
  }

  if (
    ts.isAsExpression(expression) ||
    ts.isTypeAssertionExpression(expression) ||
    ts.isSatisfiesExpression(expression)
  ) {
    return analyzePersistedStateExpression(expression.expression, context, beforePosition, visited);
  }

  if (ts.isObjectLiteralExpression(expression)) {
    return analyzeObjectLiteralStateMutation(expression);
  }

  if (ts.isIdentifier(expression)) {
    const initializer = resolveVariableInitializer(expression.text, beforePosition, context);
    if (!initializer) {
      return unknownPersistAnalysis;
    }
    return analyzePersistedStateExpression(initializer, context, beforePosition, visited);
  }

  return unknownPersistAnalysis;
}

function analyzeMutationCallSites(filePath: string, fileContent: string): MutationSourceAnalysis {
  const context = createSourceAnalysisContext(filePath, fileContent);
  const appendLines: number[] = [];
  const statePersistCalls: MutationCallSite[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const callName = getCallExpressionName(node.expression);
      if (callName === "appendProtocolEnvelope") {
        const line =
          context.sourceFile.getLineAndCharacterOfPosition(node.getStart(context.sourceFile)).line + 1;
        appendLines.push(line);
      }

      if (callName === "writeStateSnapshot") {
        const line =
          context.sourceFile.getLineAndCharacterOfPosition(node.getStart(context.sourceFile)).line + 1;
        const snippet = (context.lines[line - 1] ?? "").trim();
        const persistedStateArgument = node.arguments[1];

        if (persistedStateArgument) {
          const analysis = analyzePersistedStateExpression(
            persistedStateArgument,
            context,
            node.getStart(context.sourceFile)
          );
          const isMetadataOnlyPersist =
            analysis.analyzable && analysis.hasNonLifecycleMutation && !analysis.hasLifecycleMutation;
          if (isMetadataOnlyPersist) {
            ts.forEachChild(node, visit);
            return;
          }
        }

        statePersistCalls.push({ line, snippet });
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(context.sourceFile);
  return { appendLines, statePersistCalls };
}

function collectMutationViolations(
  filePath: string,
  fileContent: string
): MutationViolation[] {
  const analysis = analyzeMutationCallSites(filePath, fileContent);
  const violations: MutationViolation[] = [];

  if (analysis.statePersistCalls.length === 0) {
    return violations;
  }

  if (analysis.appendLines.length === 0) {
    for (const persist of analysis.statePersistCalls) {
      violations.push({
        path: filePath,
        line: persist.line,
        severity: "warn",
        kind: "state_without_transcript",
        snippet: persist.snippet
      });
    }
    return violations;
  }

  for (const persist of analysis.statePersistCalls) {
    const hasPriorAppend = analysis.appendLines.some((appendLine) => appendLine < persist.line);
    if (hasPriorAppend) {
      continue;
    }
    violations.push({
      path: filePath,
      line: persist.line,
      severity: "fail",
      kind: "state_before_transcript",
      snippet: persist.snippet
    });
  }

  return violations;
}

function summarizeMutationViolations(violations: readonly MutationViolation[]): string[] {
  return violations.slice(0, 50).map((violation) => {
    const label =
      violation.kind === "state_before_transcript"
        ? "state persist before transcript append"
        : "state persist without transcript append evidence";
    return `${violation.path}:${violation.line} [${violation.severity}] ${label} -> ${violation.snippet}`;
  });
}

export async function buildMutationCheckReport({
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
      summary: "Mutation check has no configured scope.",
      metric: check.metric,
      details: ["Set scope patterns in tools/fitness/policy.json for mutation check."]
    };
  }

  const files = await resolveFilesForScopePatterns(repoRoot, scope);
  if (files.length === 0) {
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "pass",
      summary: "Mutation check passed: no files matched current scope.",
      metric: check.metric,
      details: [`scope=${scope.join(", ")}`]
    };
  }

  const violations: MutationViolation[] = [];
  for (const absolutePath of files) {
    const raw = await readFile(absolutePath, "utf8");
    const relativePath = normalizePathToPosix(relative(repoRoot, absolutePath));
    violations.push(...collectMutationViolations(relativePath, raw));
  }

  const failCount = violations.filter((violation) => violation.severity === "fail").length;
  const warnCount = violations.filter((violation) => violation.severity === "warn").length;

  if (failCount === 0 && warnCount === 0) {
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "pass",
      summary: `Mutation check passed: ${files.length} scoped files scanned, transcript-first ordering preserved.`,
      metric: check.metric,
      details: [`scope=${scope.join(", ")}`, `files_scanned=${String(files.length)}`]
    };
  }

  if (failCount > 0) {
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "fail",
      summary: `Mutation check failed: ${String(failCount)} transcript-order violation(s) (${String(warnCount)} warning candidate(s)).`,
      metric: check.metric,
      details: summarizeMutationViolations(violations)
    };
  }

  return {
    id: check.id,
    owner: check.owner ?? "unknown",
    mode,
    status: "warn",
    summary: `Mutation check warning: ${String(warnCount)} state-persist-without-transcript candidate(s).`,
    metric: check.metric,
    details: summarizeMutationViolations(violations)
  };
}
