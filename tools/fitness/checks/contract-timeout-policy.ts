import { readFile } from "node:fs/promises";
import { relative } from "node:path";

import ts from "typescript";

import { normalizePathToPosix, resolveFilesForScopePatterns } from "../scope.js";
import type { FitnessPolicyCheck, FitnessReportCheck } from "../types.js";

type TimeoutViolationKind =
  | "raw_numeric_timeout"
  | "non_standard_timeout_reference";

interface TimeoutViolation {
  path: string;
  line: number;
  kind: TimeoutViolationKind;
  snippet: string;
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  if (ts.isParenthesizedExpression(expression)) {
    return unwrapExpression(expression.expression);
  }
  if (ts.isAsExpression(expression)) {
    return unwrapExpression(expression.expression);
  }
  if (ts.isNonNullExpression(expression)) {
    return unwrapExpression(expression.expression);
  }
  return expression;
}

function getRootIdentifierName(
  expression: ts.LeftHandSideExpression
): string | undefined {
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }
  if (ts.isPropertyAccessExpression(expression)) {
    return getRootIdentifierName(expression.expression);
  }
  if (ts.isElementAccessExpression(expression)) {
    return getRootIdentifierName(expression.expression);
  }
  if (ts.isCallExpression(expression)) {
    return getRootIdentifierName(expression.expression);
  }
  return undefined;
}

function isTestInvocation(node: ts.CallExpression): boolean {
  return getRootIdentifierName(node.expression) === "it";
}

function isNumericLiteralExpression(expression: ts.Expression): boolean {
  const unwrapped = unwrapExpression(expression);
  if (ts.isNumericLiteral(unwrapped)) {
    return true;
  }
  if (
    ts.isPrefixUnaryExpression(unwrapped)
    && (unwrapped.operator === ts.SyntaxKind.PlusToken
      || unwrapped.operator === ts.SyntaxKind.MinusToken)
    && ts.isNumericLiteral(unwrapped.operand)
  ) {
    return true;
  }
  return false;
}

function isContractTimeoutReference(expression: ts.Expression): boolean {
  const unwrapped = unwrapExpression(expression);
  if (
    ts.isPropertyAccessExpression(unwrapped)
    && ts.isIdentifier(unwrapped.expression)
    && unwrapped.expression.text === "CONTRACT_TEST_TIMEOUT"
  ) {
    return true;
  }
  if (
    ts.isElementAccessExpression(unwrapped)
    && ts.isIdentifier(unwrapped.expression)
    && unwrapped.expression.text === "CONTRACT_TEST_TIMEOUT"
    && unwrapped.argumentExpression !== undefined
    && ts.isStringLiteralLike(unwrapped.argumentExpression)
  ) {
    return true;
  }
  return false;
}

function isTimeoutPropertyName(name: ts.PropertyName): boolean {
  if (ts.isIdentifier(name)) {
    return name.text === "timeout";
  }
  if (ts.isStringLiteralLike(name)) {
    return name.text === "timeout";
  }
  return false;
}

function collectTimeoutViolations(
  relativePath: string,
  sourceText: string
): TimeoutViolation[] {
  const sourceFile = ts.createSourceFile(
    relativePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true
  );
  const lines = sourceText.split(/\r?\n/u);
  const violations: TimeoutViolation[] = [];

  const lineOf = (node: ts.Node): number =>
    sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

  const snippetAtLine = (line: number): string => (lines[line - 1] ?? "").trim();

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && isTestInvocation(node)) {
      const args = node.arguments;

      const hasFunctionArgument = args.some(
        (arg) =>
          ts.isFunctionExpression(arg)
          || ts.isArrowFunction(arg)
          || ts.isIdentifier(arg)
      );
      const lastArg = args[args.length - 1];
      if (
        hasFunctionArgument
        && lastArg !== undefined
        && isNumericLiteralExpression(lastArg)
      ) {
        const line = lineOf(lastArg);
        violations.push({
          path: relativePath,
          line,
          kind: "raw_numeric_timeout",
          snippet: snippetAtLine(line)
        });
      }

      for (const arg of args) {
        if (!ts.isObjectLiteralExpression(arg)) {
          continue;
        }
        for (const property of arg.properties) {
          if (!ts.isPropertyAssignment(property)) {
            if (
              ts.isShorthandPropertyAssignment(property)
              && property.name.text === "timeout"
            ) {
              const line = lineOf(property.name);
              violations.push({
                path: relativePath,
                line,
                kind: "non_standard_timeout_reference",
                snippet: snippetAtLine(line)
              });
            }
            continue;
          }
          if (!isTimeoutPropertyName(property.name)) {
            continue;
          }
          if (!isContractTimeoutReference(property.initializer)) {
            const line = lineOf(property.initializer);
            violations.push({
              path: relativePath,
              line,
              kind: "non_standard_timeout_reference",
              snippet: snippetAtLine(line)
            });
          }
        }
      }
    }

    node.forEachChild(visit);
  };

  visit(sourceFile);
  return violations;
}

function formatViolationDetail(violation: TimeoutViolation): string {
  const reason =
    violation.kind === "raw_numeric_timeout"
      ? "raw numeric timeout argument detected"
      : "timeout option must reference CONTRACT_TEST_TIMEOUT.*";
  return `${violation.path}:${violation.line} ${reason} -> ${violation.snippet}`;
}

export async function buildContractTimeoutPolicyCheckReport({
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
      summary: "Contract-timeout-policy check has no configured scope.",
      metric: check.metric,
      details: [
        "Set scope patterns in tools/fitness/policy.json for contract_timeout_policy check."
      ]
    };
  }

  const files = await resolveFilesForScopePatterns(repoRoot, scope);
  if (files.length === 0) {
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "pass",
      summary: "Contract-timeout-policy check passed: no files matched current scope.",
      metric: check.metric,
      details: [`scope=${scope.join(", ")}`]
    };
  }

  const violations: TimeoutViolation[] = [];
  for (const absolutePath of files) {
    const relativePath = normalizePathToPosix(relative(repoRoot, absolutePath));
    const sourceText = await readFile(absolutePath, "utf8");
    violations.push(...collectTimeoutViolations(relativePath, sourceText));
  }

  if (violations.length > 0) {
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "fail",
      summary: `Contract-timeout-policy check failed: ${String(violations.length)} violation(s) in ${String(files.length)} scanned file(s).`,
      metric: check.metric,
      details: violations.slice(0, 50).map((violation) => formatViolationDetail(violation))
    };
  }

  return {
    id: check.id,
    owner: check.owner ?? "unknown",
    mode,
    status: "pass",
    summary: `Contract-timeout-policy check passed: ${String(files.length)} scoped file(s) scanned, no timeout policy violations.`,
    metric: check.metric,
    details: [`scope=${scope.join(", ")}`, `files_scanned=${String(files.length)}`]
  };
}
