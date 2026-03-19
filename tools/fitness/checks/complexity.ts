import { readFile } from "node:fs/promises";
import { relative } from "node:path";

import ts from "typescript";

import { normalizePathToPosix, resolveFilesForScopePatterns } from "../scope.js";
import type { FitnessPolicyCheck, FitnessReportCheck } from "../types.js";

interface FunctionComplexityMetric {
  name: string;
  startLine: number;
  endLine: number;
  lineSpan: number;
  complexity: number;
}

interface FileComplexityMetric {
  path: string;
  fileLines: number;
  functions: FunctionComplexityMetric[];
}

interface ComplexityViolation {
  path: string;
  line: number;
  kind:
    | "file_lines_exceeded"
    | "function_lines_exceeded"
    | "function_complexity_exceeded";
  snippet: string;
}

const DEFAULT_MAX_FILE_LINES = 500;
const DEFAULT_MAX_FUNCTION_LINES = 120;
const DEFAULT_MAX_FUNCTION_COMPLEXITY = 20;
const DEFAULT_TOP_OFFENDER_LIMIT = 10;

function functionDisplayName(node: ts.Node): string {
  if (
    (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) &&
    node.name !== undefined &&
    ts.isIdentifier(node.name)
  ) {
    return node.name.text;
  }
  if (
    ts.isFunctionExpression(node) &&
    node.name !== undefined &&
    ts.isIdentifier(node.name)
  ) {
    return node.name.text;
  }
  if (ts.isArrowFunction(node)) {
    return "<arrow>";
  }
  if (ts.isConstructorDeclaration(node)) {
    return "<constructor>";
  }
  if (ts.isGetAccessorDeclaration(node)) {
    return "<getter>";
  }
  if (ts.isSetAccessorDeclaration(node)) {
    return "<setter>";
  }
  return "<anonymous>";
}

function isFunctionLikeWithBody(
  node: ts.Node
): node is
  | ts.FunctionDeclaration
  | ts.MethodDeclaration
  | ts.FunctionExpression
  | ts.ArrowFunction
  | ts.ConstructorDeclaration
  | ts.GetAccessorDeclaration
  | ts.SetAccessorDeclaration {
  return (
    (ts.isFunctionDeclaration(node)
      || ts.isMethodDeclaration(node)
      || ts.isFunctionExpression(node)
      || ts.isArrowFunction(node)
      || ts.isConstructorDeclaration(node)
      || ts.isGetAccessorDeclaration(node)
      || ts.isSetAccessorDeclaration(node))
    && node.body !== undefined
  );
}

function estimateComplexity(body: ts.Node): number {
  let complexity = 1;
  const walk = (node: ts.Node): void => {
    if (
      ts.isIfStatement(node)
      || ts.isConditionalExpression(node)
      || ts.isForStatement(node)
      || ts.isForInStatement(node)
      || ts.isForOfStatement(node)
      || ts.isWhileStatement(node)
      || ts.isDoStatement(node)
      || ts.isCatchClause(node)
    ) {
      complexity += 1;
    }
    if (ts.isCaseClause(node)) {
      complexity += 1;
    }
    if (
      ts.isBinaryExpression(node)
      && (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
        || node.operatorToken.kind === ts.SyntaxKind.BarBarToken
        || node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken)
    ) {
      complexity += 1;
    }
    node.forEachChild(walk);
  };
  body.forEachChild(walk);
  return complexity;
}

function collectFileComplexityMetrics(input: {
  path: string;
  sourceText: string;
}): FileComplexityMetric {
  const sourceFile = ts.createSourceFile(
    input.path,
    input.sourceText,
    ts.ScriptTarget.Latest,
    true
  );
  const fileLines = sourceFile.getLineAndCharacterOfPosition(sourceFile.end).line + 1;
  const functions: FunctionComplexityMetric[] = [];

  const visit = (node: ts.Node): void => {
    if (isFunctionLikeWithBody(node)) {
      const body = node.body;
      if (body === undefined) {
        return;
      }
      const startLine =
        sourceFile.getLineAndCharacterOfPosition(body.getStart(sourceFile)).line + 1;
      const endLine = sourceFile.getLineAndCharacterOfPosition(body.end).line + 1;
      functions.push({
        name: functionDisplayName(node),
        startLine,
        endLine,
        lineSpan: endLine - startLine + 1,
        complexity: estimateComplexity(body)
      });
    }
    node.forEachChild(visit);
  };

  visit(sourceFile);
  return {
    path: input.path,
    fileLines,
    functions
  };
}

function collectComplexityViolations(
  metric: FileComplexityMetric
): ComplexityViolation[] {
  const violations: ComplexityViolation[] = [];
  if (metric.fileLines > DEFAULT_MAX_FILE_LINES) {
    violations.push({
      path: metric.path,
      line: 1,
      kind: "file_lines_exceeded",
      snippet: `file_lines=${String(metric.fileLines)} max=${String(DEFAULT_MAX_FILE_LINES)}`
    });
  }
  for (const fn of metric.functions) {
    if (fn.lineSpan > DEFAULT_MAX_FUNCTION_LINES) {
      violations.push({
        path: metric.path,
        line: fn.startLine,
        kind: "function_lines_exceeded",
        snippet:
          `function=${fn.name} lines=${String(fn.lineSpan)} max=${String(DEFAULT_MAX_FUNCTION_LINES)}`
      });
    }
    if (fn.complexity > DEFAULT_MAX_FUNCTION_COMPLEXITY) {
      violations.push({
        path: metric.path,
        line: fn.startLine,
        kind: "function_complexity_exceeded",
        snippet:
          `function=${fn.name} complexity=${String(fn.complexity)} max=${String(DEFAULT_MAX_FUNCTION_COMPLEXITY)}`
      });
    }
  }
  return violations;
}

function summarizeComplexityViolations(
  violations: readonly ComplexityViolation[]
): string[] {
  return violations.slice(0, 50).map((violation) => {
    const label =
      violation.kind === "file_lines_exceeded"
        ? "file line budget exceeded"
        : violation.kind === "function_lines_exceeded"
          ? "function line budget exceeded"
          : "function complexity budget exceeded";
    return `${violation.path}:${violation.line} ${label} -> ${violation.snippet}`;
  });
}

function topOffendersDetails(metrics: readonly FileComplexityMetric[]): string[] {
  const offenders: string[] = [];
  const byFile = [...metrics]
    .sort((left, right) => right.fileLines - left.fileLines)
    .slice(0, DEFAULT_TOP_OFFENDER_LIMIT);
  for (const fileMetric of byFile) {
    offenders.push(
      `top_file path=${fileMetric.path} lines=${String(fileMetric.fileLines)}`
    );
  }

  const allFunctions = metrics.flatMap((fileMetric) =>
    fileMetric.functions.map((fn) => ({
      filePath: fileMetric.path,
      ...fn
    }))
  );
  const byFunctionComplexity = [...allFunctions]
    .sort((left, right) => right.complexity - left.complexity)
    .slice(0, DEFAULT_TOP_OFFENDER_LIMIT);
  for (const fn of byFunctionComplexity) {
    offenders.push(
      `top_function path=${fn.filePath}:${String(fn.startLine)} name=${fn.name} complexity=${String(fn.complexity)} lines=${String(fn.lineSpan)}`
    );
  }
  return offenders.slice(0, DEFAULT_TOP_OFFENDER_LIMIT * 2);
}

export async function buildComplexityCheckReport({
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
      summary: "Complexity check has no configured scope.",
      metric: check.metric,
      details: ["Set scope patterns in tools/fitness/policy.json for complexity check."]
    };
  }

  const files = await resolveFilesForScopePatterns(repoRoot, scope);
  if (files.length === 0) {
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "pass",
      summary: "Complexity check passed: no files matched current scope.",
      metric: check.metric,
      details: [`scope=${scope.join(", ")}`]
    };
  }

  const metrics: FileComplexityMetric[] = [];
  const violations: ComplexityViolation[] = [];
  for (const absolutePath of files) {
    const raw = await readFile(absolutePath, "utf8");
    const relativePath = normalizePathToPosix(relative(repoRoot, absolutePath));
    const metric = collectFileComplexityMetrics({
      path: relativePath,
      sourceText: raw
    });
    metrics.push(metric);
    violations.push(...collectComplexityViolations(metric));
  }

  if (violations.length === 0) {
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "pass",
      summary: `Complexity check passed: ${files.length} scoped files scanned within default budgets.`,
      metric: check.metric,
      details: [
        `scope=${scope.join(", ")}`,
        `files_scanned=${String(files.length)}`,
        ...topOffendersDetails(metrics)
      ]
    };
  }

  return {
    id: check.id,
    owner: check.owner ?? "unknown",
    mode,
    status: "fail",
    summary: `Complexity check failed: ${String(violations.length)} budget violation(s) detected.`,
    metric: check.metric,
    details: [
      ...summarizeComplexityViolations(violations),
      ...topOffendersDetails(metrics)
    ]
  };
}
