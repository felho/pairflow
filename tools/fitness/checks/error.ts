import { readFile } from "node:fs/promises";
import { relative } from "node:path";
import ts from "typescript";

import { normalizePathToPosix, resolveFilesForScopePatterns } from "../scope.js";
import type { FitnessPolicyCheck, FitnessReportCheck } from "../types.js";

interface ErrorViolation {
  path: string;
  line: number;
  severity: "fail" | "warn";
  kind: "missing_code" | "missing_context";
  snippet: string;
}

interface ThrowSite {
  line: number;
  snippet: string;
  contextWindow: string;
  usesStructuredErrorWrapper: boolean;
  hasStructuredContextArgument: boolean;
}

const bareRethrowPattern = /^\s*throw\s+[A-Za-z_$][\w$]*\s*;?\s*$/u;
const codeMarkers: readonly RegExp[] = [
  /\breason_code\b/u,
  /\breasonCode\b/u,
  /\bcode\s*:\s*["'`][A-Za-z0-9_:-]+["'`]/u,
  /\b[A-Z][A-Z0-9_]{2,}\b/u
] as const;

const contextMarkers: readonly RegExp[] = [
  /\bcontext\b/u,
  /\bbubble_id\b|\bbubbleId\b/u,
  /\bcommand_name\b|\bcommandName\b/u,
  /\boperation_id\b|\boperationId\b/u,
  /\bround\b/u,
  /\bbase_branch\b|\bbaseBranch\b/u,
  /\bbubble_branch\b|\bbubbleBranch\b/u,
  /\brepo_path\b|\brepoPath\b/u,
  /\bstate_path\b|\bstatePath\b/u
] as const;

const contextObjectKeys = new Set([
  "context",
  "bubble_id",
  "bubbleId",
  "command_name",
  "commandName",
  "operation_id",
  "operationId",
  "round",
  "base_branch",
  "baseBranch",
  "bubble_branch",
  "bubbleBranch",
  "repo_path",
  "repoPath",
  "state_path",
  "statePath"
]);

function hasAnyPattern(text: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
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

function getPropertyNameText(name: ts.PropertyName): string | null {
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return null;
}

function isStructuredErrorName(name: string): boolean {
  if (/^normalize[A-Za-z0-9_]*Error$/u.test(name)) {
    return true;
  }
  if (/^to[A-Za-z0-9_]*Error$/u.test(name)) {
    return true;
  }
  if (/^[A-Z][A-Za-z0-9_]*Error$/u.test(name)) {
    return true;
  }
  return false;
}

function usesStructuredErrorWrapper(expression: ts.Expression): boolean {
  if (ts.isCallExpression(expression)) {
    const name = getCallExpressionName(expression.expression);
    return name !== null && isStructuredErrorName(name);
  }
  if (ts.isNewExpression(expression)) {
    const name = getCallExpressionName(expression.expression);
    return name !== null && isStructuredErrorName(name);
  }
  return false;
}

function hasStructuredContextArgument(expression: ts.Expression): boolean {
  const args =
    ts.isCallExpression(expression) || ts.isNewExpression(expression)
      ? expression.arguments
      : undefined;
  if (!args) {
    return false;
  }

  for (const arg of args) {
    if (!ts.isObjectLiteralExpression(arg)) {
      continue;
    }
    for (const property of arg.properties) {
      if (
        !ts.isPropertyAssignment(property) &&
        !ts.isShorthandPropertyAssignment(property) &&
        !ts.isMethodDeclaration(property) &&
        !ts.isGetAccessorDeclaration(property) &&
        !ts.isSetAccessorDeclaration(property)
      ) {
        continue;
      }
      const key = getPropertyNameText(property.name);
      if (key !== null && contextObjectKeys.has(key)) {
        return true;
      }
    }
  }

  return false;
}

function collectThrowSites(fileContent: string): ThrowSite[] {
  const sourceFile = ts.createSourceFile("error.ts", fileContent, ts.ScriptTarget.Latest, true);
  const lines = fileContent.split(/\r?\n/u);
  const sites: ThrowSite[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isThrowStatement(node)) {
      const expression = node.expression;
      if (!expression) {
        ts.forEachChild(node, visit);
        return;
      }

      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
      const snippet = (lines[line - 1] ?? "").trim();
      if (snippet.startsWith("//") || bareRethrowPattern.test(snippet)) {
        ts.forEachChild(node, visit);
        return;
      }

      const windowStart = Math.max(0, line - 1 - 6);
      const windowEnd = Math.min(lines.length - 1, line - 1 + 6);
      const contextWindow = lines.slice(windowStart, windowEnd + 1).join("\n");

      sites.push({
        line,
        snippet,
        contextWindow,
        usesStructuredErrorWrapper: usesStructuredErrorWrapper(expression),
        hasStructuredContextArgument: hasStructuredContextArgument(expression)
      });
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return sites;
}

function collectErrorViolations(filePath: string, fileContent: string): ErrorViolation[] {
  const throwSites = collectThrowSites(fileContent);
  const violations: ErrorViolation[] = [];

  for (const site of throwSites) {
    const hasCode =
      hasAnyPattern(site.contextWindow, codeMarkers) || site.usesStructuredErrorWrapper;
    const hasContext =
      hasAnyPattern(site.contextWindow, contextMarkers) || site.hasStructuredContextArgument;

    if (!hasCode) {
      violations.push({
        path: filePath,
        line: site.line,
        severity: site.usesStructuredErrorWrapper ? "warn" : "fail",
        kind: "missing_code",
        snippet: site.snippet
      });
      continue;
    }

    if (!hasContext) {
      violations.push({
        path: filePath,
        line: site.line,
        severity: site.usesStructuredErrorWrapper ? "warn" : "fail",
        kind: "missing_context",
        snippet: site.snippet
      });
    }
  }

  return violations;
}

function summarizeErrorViolations(violations: readonly ErrorViolation[]): string[] {
  return violations.slice(0, 50).map((violation) => {
    const label =
      violation.kind === "missing_code"
        ? "missing stable error code near throw"
        : "missing required error context near throw";
    return `${violation.path}:${violation.line} [${violation.severity}] ${label} -> ${violation.snippet}`;
  });
}

export async function buildErrorCheckReport({
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
      summary: "Error check has no configured scope.",
      metric: check.metric,
      details: ["Set scope patterns in tools/fitness/policy.json for error check."]
    };
  }

  const files = await resolveFilesForScopePatterns(repoRoot, scope);
  if (files.length === 0) {
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "pass",
      summary: "Error check passed: no files matched current scope.",
      metric: check.metric,
      details: [`scope=${scope.join(", ")}`]
    };
  }

  const violations: ErrorViolation[] = [];
  for (const absolutePath of files) {
    const raw = await readFile(absolutePath, "utf8");
    const relativePath = normalizePathToPosix(relative(repoRoot, absolutePath));
    violations.push(...collectErrorViolations(relativePath, raw));
  }

  const failCount = violations.filter((violation) => violation.severity === "fail").length;
  const warnCount = violations.filter((violation) => violation.severity === "warn").length;

  if (failCount === 0 && warnCount === 0) {
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "pass",
      summary: `Error check passed: ${files.length} scoped files scanned, code+context markers present on throw boundaries.`,
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
      summary: `Error check failed: ${String(failCount)} fail + ${String(warnCount)} warn throw boundary violation(s).`,
      metric: check.metric,
      details: summarizeErrorViolations(violations)
    };
  }

  return {
    id: check.id,
    owner: check.owner ?? "unknown",
    mode,
    status: "warn",
    summary: `Error check warning: ${String(warnCount)} throw boundary warning(s).`,
    metric: check.metric,
    details: summarizeErrorViolations(violations)
  };
}
