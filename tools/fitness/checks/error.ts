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
  expression: ts.Expression;
  throwStart: number;
  usesStructuredErrorWrapper: boolean;
  hasStructuredContextArgument: boolean;
}

interface SourceAnalysisContext {
  sourceFile: ts.SourceFile;
  variableDeclarations: Map<string, ts.VariableDeclaration[]>;
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
  "contexts",
  "bubble_id",
  "bubbleId",
  "bubble_state",
  "bubbleState",
  "command_name",
  "commandName",
  "operation_id",
  "operationId",
  "round",
  "reason",
  "diagnostics",
  "metadata",
  "base_branch",
  "baseBranch",
  "bubble_branch",
  "bubbleBranch",
  "repo_path",
  "repoPath",
  "state_path",
  "statePath",
  "from_state",
  "fromState",
  "to_state",
  "toState",
  "rollbackReasonCode",
  "rollbackOutcome",
  "rollbackTargetState",
  "stageReasonCode",
  "restoreReasonCode",
  "retryInvariantReasonCode"
]);

const explicitCodeObjectKeys = new Set([
  "reason_code",
  "reasonCode",
  "code",
  "error_code",
  "errorCode",
  "rollbackReasonCode",
  "stageReasonCode",
  "restoreReasonCode",
  "retryInvariantReasonCode"
]);

const contextIdentifierHints = new Set([
  "context",
  "contexts",
  "metadata",
  "diagnostics",
  "bubbleContext",
  "commandContext",
  "errorContext"
]);

function hasAnyPattern(text: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  if (ts.isParenthesizedExpression(expression)) {
    return unwrapExpression(expression.expression);
  }
  if (
    ts.isAsExpression(expression) ||
    ts.isTypeAssertionExpression(expression) ||
    ts.isSatisfiesExpression(expression)
  ) {
    return unwrapExpression(expression.expression);
  }
  if (ts.isNonNullExpression(expression)) {
    return unwrapExpression(expression.expression);
  }
  return expression;
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

function expressionTextMatchesCodeMarkers(
  expression: ts.Expression,
  context: SourceAnalysisContext
): boolean {
  return hasAnyPattern(expression.getText(context.sourceFile), codeMarkers);
}

function hasAstCodeEvidence(
  expression: ts.Expression,
  context: SourceAnalysisContext,
  beforePosition: number,
  visited: Set<number> = new Set()
): boolean {
  const node = unwrapExpression(expression);
  if (visited.has(node.pos)) {
    return false;
  }
  visited.add(node.pos);

  if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return hasAnyPattern(node.text, codeMarkers);
  }

  if (ts.isTemplateExpression(node)) {
    if (hasAnyPattern(node.head.text, codeMarkers)) {
      return true;
    }
    for (const span of node.templateSpans) {
      if (hasAstCodeEvidence(span.expression, context, beforePosition, visited)) {
        return true;
      }
      if (hasAnyPattern(span.literal.text, codeMarkers)) {
        return true;
      }
    }
    return false;
  }

  if (ts.isIdentifier(node)) {
    if (/reason[_A-Za-z0-9]*code/iu.test(node.text)) {
      return true;
    }
    if (/^[A-Z][A-Z0-9_]{2,}$/u.test(node.text)) {
      return true;
    }
    const initializer = resolveVariableInitializer(node.text, beforePosition, context);
    if (!initializer) {
      return false;
    }
    return hasAstCodeEvidence(initializer, context, node.getStart(context.sourceFile), visited);
  }

  if (ts.isPropertyAccessExpression(node)) {
    if (explicitCodeObjectKeys.has(node.name.text)) {
      return true;
    }
    return hasAstCodeEvidence(node.expression, context, beforePosition, visited);
  }

  if (ts.isElementAccessExpression(node)) {
    if (
      node.argumentExpression !== undefined &&
      ts.isStringLiteralLike(node.argumentExpression) &&
      explicitCodeObjectKeys.has(node.argumentExpression.text)
    ) {
      return true;
    }
    return hasAstCodeEvidence(node.expression, context, beforePosition, visited);
  }

  if (ts.isObjectLiteralExpression(node)) {
    for (const property of node.properties) {
      if (ts.isSpreadAssignment(property)) {
        if (hasAstCodeEvidence(property.expression, context, beforePosition, visited)) {
          return true;
        }
        continue;
      }
      if (ts.isPropertyAssignment(property)) {
        const key = getPropertyNameText(property.name);
        if (key !== null && explicitCodeObjectKeys.has(key)) {
          return true;
        }
        if (hasAstCodeEvidence(property.initializer, context, beforePosition, visited)) {
          return true;
        }
        continue;
      }
      if (ts.isShorthandPropertyAssignment(property)) {
        if (explicitCodeObjectKeys.has(property.name.text)) {
          return true;
        }
        if (hasAstCodeEvidence(property.name, context, beforePosition, visited)) {
          return true;
        }
      }
    }
    return false;
  }

  if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
    const callName = getCallExpressionName(node.expression);
    if (callName !== null && isStructuredErrorName(callName)) {
      return true;
    }
    const args = node.arguments ?? [];
    for (const arg of args) {
      if (hasAstCodeEvidence(arg, context, beforePosition, visited)) {
        return true;
      }
    }
    return expressionTextMatchesCodeMarkers(node, context);
  }

  if (ts.isBinaryExpression(node)) {
    return (
      hasAstCodeEvidence(node.left, context, beforePosition, visited) ||
      hasAstCodeEvidence(node.right, context, beforePosition, visited)
    );
  }

  if (ts.isConditionalExpression(node)) {
    return (
      hasAstCodeEvidence(node.whenTrue, context, beforePosition, visited) ||
      hasAstCodeEvidence(node.whenFalse, context, beforePosition, visited)
    );
  }

  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.some((element) =>
      ts.isExpression(element) && hasAstCodeEvidence(element, context, beforePosition, visited)
    );
  }

  return expressionTextMatchesCodeMarkers(node, context);
}

function expressionTextMatchesContextMarkers(
  expression: ts.Expression,
  context: SourceAnalysisContext
): boolean {
  return hasAnyPattern(expression.getText(context.sourceFile), contextMarkers);
}

function hasAstContextEvidence(
  expression: ts.Expression,
  context: SourceAnalysisContext,
  beforePosition: number,
  visited: Set<number> = new Set()
): boolean {
  const node = unwrapExpression(expression);
  if (visited.has(node.pos)) {
    return false;
  }
  visited.add(node.pos);

  if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return hasAnyPattern(node.text, contextMarkers);
  }

  if (ts.isTemplateExpression(node)) {
    if (hasAnyPattern(node.head.text, contextMarkers)) {
      return true;
    }
    for (const span of node.templateSpans) {
      if (hasAstContextEvidence(span.expression, context, beforePosition, visited)) {
        return true;
      }
      if (hasAnyPattern(span.literal.text, contextMarkers)) {
        return true;
      }
    }
    return false;
  }

  if (ts.isIdentifier(node)) {
    if (contextIdentifierHints.has(node.text)) {
      return true;
    }
    if (contextObjectKeys.has(node.text)) {
      return true;
    }
    const initializer = resolveVariableInitializer(node.text, beforePosition, context);
    if (!initializer) {
      return false;
    }
    return hasAstContextEvidence(initializer, context, node.getStart(context.sourceFile), visited);
  }

  if (ts.isPropertyAccessExpression(node)) {
    if (contextObjectKeys.has(node.name.text)) {
      return true;
    }
    return hasAstContextEvidence(node.expression, context, beforePosition, visited);
  }

  if (ts.isElementAccessExpression(node)) {
    if (
      node.argumentExpression !== undefined &&
      ts.isStringLiteralLike(node.argumentExpression) &&
      contextObjectKeys.has(node.argumentExpression.text)
    ) {
      return true;
    }
    return hasAstContextEvidence(node.expression, context, beforePosition, visited);
  }

  if (ts.isObjectLiteralExpression(node)) {
    for (const property of node.properties) {
      if (ts.isSpreadAssignment(property)) {
        if (hasAstContextEvidence(property.expression, context, beforePosition, visited)) {
          return true;
        }
        continue;
      }
      if (ts.isPropertyAssignment(property)) {
        const key = getPropertyNameText(property.name);
        if (key !== null && contextObjectKeys.has(key)) {
          return true;
        }
        if (hasAstContextEvidence(property.initializer, context, beforePosition, visited)) {
          return true;
        }
        continue;
      }
      if (ts.isShorthandPropertyAssignment(property)) {
        if (contextObjectKeys.has(property.name.text)) {
          return true;
        }
        if (hasAstContextEvidence(property.name, context, beforePosition, visited)) {
          return true;
        }
      }
    }
    return false;
  }

  if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
    const callName = getCallExpressionName(node.expression);
    if (callName !== null && /^to[A-Za-z0-9_]*Error$/u.test(callName)) {
      return true;
    }
    const args = node.arguments ?? [];
    for (const arg of args) {
      if (hasAstContextEvidence(arg, context, beforePosition, visited)) {
        return true;
      }
    }
    return expressionTextMatchesContextMarkers(node, context);
  }

  if (ts.isBinaryExpression(node)) {
    return (
      hasAstContextEvidence(node.left, context, beforePosition, visited) ||
      hasAstContextEvidence(node.right, context, beforePosition, visited)
    );
  }

  if (ts.isConditionalExpression(node)) {
    return (
      hasAstContextEvidence(node.whenTrue, context, beforePosition, visited) ||
      hasAstContextEvidence(node.whenFalse, context, beforePosition, visited)
    );
  }

  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.some((element) =>
      ts.isExpression(element) && hasAstContextEvidence(element, context, beforePosition, visited)
    );
  }

  return expressionTextMatchesContextMarkers(node, context);
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
  if (ts.isCallExpression(expression)) {
    const calleeName = getCallExpressionName(expression.expression);
    // Helper wrappers like toTransitionError()/toConflictError() delegate
    // contextualization inside dedicated conversion helpers.
    if (calleeName !== null && /^to[A-Za-z0-9_]*Error$/u.test(calleeName)) {
      return true;
    }
  }

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
    let hasContextKey = false;
    let hasErrorKey = false;
    let hasClassifier = false;
    let hasFactory = false;

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
      if (key === null) {
        continue;
      }
      if (contextObjectKeys.has(key)) {
        hasContextKey = true;
      }
      if (key === "error") {
        hasErrorKey = true;
      }
      if (/^is[A-Z0-9_]/u.test(key)) {
        hasClassifier = true;
      }
      if (/^create[A-Z0-9_]/u.test(key)) {
        hasFactory = true;
      }
    }

    if (hasContextKey) {
      return true;
    }
    // Normalization adapters often delegate contextualization through classifier+factory pairs.
    if (hasErrorKey && hasClassifier && hasFactory) {
      return true;
    }
  }

  return false;
}

function collectThrowSites(
  fileContent: string,
  context: SourceAnalysisContext
): ThrowSite[] {
  const lines = fileContent.split(/\r?\n/u);
  const sites: ThrowSite[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isThrowStatement(node)) {
      const expression = node.expression;
      if (!expression) {
        ts.forEachChild(node, visit);
        return;
      }

      const line =
        context.sourceFile.getLineAndCharacterOfPosition(
          node.getStart(context.sourceFile)
        ).line + 1;
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
        expression,
        throwStart: node.getStart(context.sourceFile),
        usesStructuredErrorWrapper: usesStructuredErrorWrapper(expression),
        hasStructuredContextArgument: hasStructuredContextArgument(expression)
      });
    }

    ts.forEachChild(node, visit);
  };

  visit(context.sourceFile);
  return sites;
}

function collectErrorViolations(filePath: string, fileContent: string): ErrorViolation[] {
  const sourceContext = createSourceAnalysisContext(filePath, fileContent);
  const throwSites = collectThrowSites(fileContent, sourceContext);
  const violations: ErrorViolation[] = [];

  for (const site of throwSites) {
    const hasCode =
      hasAstCodeEvidence(site.expression, sourceContext, site.throwStart) ||
      hasAnyPattern(site.contextWindow, codeMarkers) ||
      site.usesStructuredErrorWrapper;
    const hasContext =
      hasAstContextEvidence(site.expression, sourceContext, site.throwStart) ||
      site.hasStructuredContextArgument ||
      hasAnyPattern(site.contextWindow, contextMarkers);

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
