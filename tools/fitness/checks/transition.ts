import { readFile } from "node:fs/promises";
import { relative } from "node:path";
import * as ts from "typescript";

import { normalizePathToPosix, resolveFilesForScopePatterns } from "../scope.js";
import type { FitnessPolicyCheck, FitnessReportCheck } from "../types.js";

interface TransitionViolation {
  path: string;
  line: number;
  severity: "fail" | "warn";
  kind: "persist_without_validation" | "manual_next_state_candidate";
  snippet: string;
}

const transitionValidationMarkerPatterns: readonly RegExp[] = [
  /\bapplyStateTransition\s*\(/u,
  /\bStateTransitionService\b/u,
  /\bresolve[A-Za-z0-9_]*NextState\s*\(/u,
  /\bqueueDeferredReworkTransition\s*\(/u
] as const;

const stateSpreadPattern = /\.\.\.\s*(?:state|currentState)\b/u;
const sensitiveStateFieldPattern =
  /\b(?:state|round|active_agent|active_role|active_since)\s*:/u;
const lifecycleStateFields = new Set(["state", "round", "active_agent", "active_role", "active_since"]);

interface StatePersistAnalysis {
  analyzable: boolean;
  hasLifecycleMutation: boolean;
  hasNonLifecycleMutation: boolean;
}

const unknownPersistAnalysis: StatePersistAnalysis = {
  analyzable: false,
  hasLifecycleMutation: false,
  hasNonLifecycleMutation: false
};

interface SourceAnalysisContext {
  sourceFile: ts.SourceFile;
  variableDeclarations: Map<string, ts.VariableDeclaration[]>;
}

function createSourceAnalysisContext(filePath: string, fileContent: string): SourceAnalysisContext {
  const sourceFile = ts.createSourceFile(filePath, fileContent, ts.ScriptTarget.Latest, true);
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
  return { sourceFile, variableDeclarations };
}

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

function collectPersistCalls(sourceFile: ts.SourceFile): ts.CallExpression[] {
  const calls: ts.CallExpression[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const callName = getCallExpressionName(node.expression);
      if (callName === "writeStateSnapshot") {
        calls.push(node);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return calls;
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

function getPropertyNameText(name: ts.PropertyName): string | null {
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return null;
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

function collectLineNumbers(lines: readonly string[], pattern: RegExp): number[] {
  const matches: number[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (pattern.test(line)) {
      matches.push(index + 1);
    }
  }
  return matches;
}

function collectPersistValidationViolations(
  filePath: string,
  lines: readonly string[],
  context: SourceAnalysisContext
): TransitionViolation[] {
  const violations: TransitionViolation[] = [];
  const persistCalls = collectPersistCalls(context.sourceFile);
  const validationMarkerLines = transitionValidationMarkerPatterns.flatMap((pattern) =>
    collectLineNumbers(lines, pattern)
  );
  for (const persistCall of persistCalls) {
    const persistLine =
      context.sourceFile.getLineAndCharacterOfPosition(persistCall.getStart(context.sourceFile)).line + 1;
    const persistedStateArgument = persistCall.arguments[1];
    if (persistedStateArgument) {
      const analysis = analyzePersistedStateExpression(
        persistedStateArgument,
        context,
        persistCall.getStart(context.sourceFile)
      );
      const isMetadataOnlyPersist =
        analysis.analyzable && analysis.hasNonLifecycleMutation && !analysis.hasLifecycleMutation;
      if (isMetadataOnlyPersist) {
        continue;
      }
    }
    const hasPriorValidationMarker = validationMarkerLines.some(
      (markerLine) => markerLine < persistLine
    );
    if (hasPriorValidationMarker) {
      continue;
    }
    const snippet = (lines[persistLine - 1] ?? "").trim();
    violations.push({
      path: filePath,
      line: persistLine,
      severity: "fail",
      kind: "persist_without_validation",
      snippet
    });
  }
  return violations;
}

function collectManualNextStateCandidates(
  filePath: string,
  lines: readonly string[]
): TransitionViolation[] {
  const warnings: TransitionViolation[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (!stateSpreadPattern.test(line)) {
      continue;
    }
    const windowEnd = Math.min(index + 12, lines.length - 1);
    let hasSensitiveFieldMutation = false;
    for (let cursor = index; cursor <= windowEnd; cursor += 1) {
      const candidate = lines[cursor] ?? "";
      if (sensitiveStateFieldPattern.test(candidate)) {
        hasSensitiveFieldMutation = true;
        break;
      }
    }
    if (!hasSensitiveFieldMutation) {
      continue;
    }
    warnings.push({
      path: filePath,
      line: index + 1,
      severity: "warn",
      kind: "manual_next_state_candidate",
      snippet: line.trim()
    });
  }
  return warnings;
}

function collectTransitionViolations(
  filePath: string,
  fileContent: string
): TransitionViolation[] {
  const lines = fileContent.split(/\r?\n/u);
  const context = createSourceAnalysisContext(filePath, fileContent);
  return [
    ...collectPersistValidationViolations(filePath, lines, context),
    ...collectManualNextStateCandidates(filePath, lines)
  ];
}

function summarizeTransitionViolations(
  violations: readonly TransitionViolation[]
): string[] {
  return violations.slice(0, 50).map((violation) => {
    const violationLabel =
      violation.kind === "persist_without_validation"
        ? "persist without transition validation"
        : "manual next-state candidate";
    return `${violation.path}:${violation.line} [${violation.severity}] ${violationLabel} -> ${violation.snippet}`;
  });
}

export async function buildTransitionCheckReport({
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
      summary: "Transition check has no configured scope.",
      metric: check.metric,
      details: ["Set scope patterns in tools/fitness/policy.json for transition check."]
    };
  }

  const files = await resolveFilesForScopePatterns(repoRoot, scope);
  if (files.length === 0) {
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "pass",
      summary: "Transition check passed: no files matched current scope.",
      metric: check.metric,
      details: [`scope=${scope.join(", ")}`]
    };
  }

  const allViolations: TransitionViolation[] = [];
  for (const absolutePath of files) {
    const raw = await readFile(absolutePath, "utf8");
    const relativePath = normalizePathToPosix(relative(repoRoot, absolutePath));
    allViolations.push(...collectTransitionViolations(relativePath, raw));
  }

  const failCount = allViolations.filter((violation) => violation.severity === "fail").length;
  const warnCount = allViolations.filter((violation) => violation.severity === "warn").length;
  if (failCount === 0 && warnCount === 0) {
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "pass",
      summary: `Transition check passed: ${files.length} scoped files scanned, no validation-order issues detected.`,
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
      summary: `Transition check failed: ${String(failCount)} persist-before-validation violation(s) (${String(warnCount)} warning candidate(s)).`,
      metric: check.metric,
      details: summarizeTransitionViolations(allViolations)
    };
  }

  return {
    id: check.id,
    owner: check.owner ?? "unknown",
    mode,
    status: "warn",
    summary: `Transition check warning: ${String(warnCount)} manual next-state candidate(s) detected.`,
    metric: check.metric,
    details: summarizeTransitionViolations(allViolations)
  };
}
