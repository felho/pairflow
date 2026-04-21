import { readFile } from "node:fs/promises";
import { relative } from "node:path";

import ts from "typescript";

import { normalizePathToPosix, resolveFilesForScopePatterns } from "../scope.js";
import type { FitnessPolicyCheck, FitnessReportCheck } from "../types.js";

type InvariantStatus = "covered" | "missing" | "absent";

interface CommandInvariantDefinition {
  command: "kickoff" | "pass" | "converged" | "approval" | "reply" | "askHuman";
  folderScopes: readonly string[];
  adapterNames: readonly string[];
  resultPropertyNames: readonly string[];
  acceptedOutcomePropertyNames: readonly string[];
}

interface CommandInvariantResult {
  command: CommandInvariantDefinition["command"];
  status: InvariantStatus;
  evidence: string[];
}

const commandInvariantDefinitions: readonly CommandInvariantDefinition[] = [
  {
    command: "kickoff",
    folderScopes: ["application", "shared"],
    adapterNames: ["emitDeliveryNotificationAck", "emitTmuxDeliveryNotification"],
    resultPropertyNames: ["delivery"],
    acceptedOutcomePropertyNames: ["delivered", "status", "failure", "error", "reason_code", "reasonCode"]
  },
  {
    command: "pass",
    folderScopes: ["application", "shared"],
    adapterNames: ["emitDeliveryNotificationAck", "emitTmuxDeliveryNotification"],
    resultPropertyNames: ["delivery"],
    acceptedOutcomePropertyNames: ["delivered", "status", "failure", "error", "reason_code", "reasonCode"]
  },
  {
    command: "converged",
    folderScopes: ["application", "shared"],
    adapterNames: ["emitDeliveryNotificationAck", "emitTmuxDeliveryNotification"],
    resultPropertyNames: ["delivery"],
    acceptedOutcomePropertyNames: ["delivered", "status", "failure", "error", "reason_code", "reasonCode"]
  },
  {
    command: "approval",
    folderScopes: ["application", "shared"],
    adapterNames: ["emitDeliveryNotificationAck", "emitTmuxDeliveryNotification"],
    resultPropertyNames: ["delivery"],
    acceptedOutcomePropertyNames: ["delivered", "status", "failure", "error", "reason_code", "reasonCode"]
  },
  {
    command: "reply",
    folderScopes: ["application", "shared"],
    adapterNames: ["emitDeliveryNotificationAck", "emitTmuxDeliveryNotification"],
    resultPropertyNames: ["delivery"],
    acceptedOutcomePropertyNames: ["delivered", "status", "failure", "error", "reason_code", "reasonCode"]
  },
  {
    command: "askHuman",
    folderScopes: ["application", "shared"],
    adapterNames: ["emitDeliveryNotificationAck", "emitTmuxDeliveryNotification"],
    resultPropertyNames: ["delivery"],
    acceptedOutcomePropertyNames: ["delivered", "status", "failure", "error", "reason_code", "reasonCode"]
  }
] as const;

function commandFolderPatterns(
  definition: CommandInvariantDefinition
): RegExp[] {
  return definition.folderScopes.map((scope) =>
    new RegExp(`/src/v11/${scope}/${definition.command}/`, "u")
  );
}

function buildCriticalSideEffectSearchScope(
  scope: string[]
): string[] {
  const expanded = new Set(scope);
  for (const definition of commandInvariantDefinitions) {
    for (const folderScope of definition.folderScopes) {
      expanded.add(`src/v11/${folderScope}/${definition.command}/**`);
    }
  }
  return [...expanded];
}

function isContractOnlyEvidencePath(relativePath: string): boolean {
  const normalized = normalizePathToPosix(relativePath).toLowerCase();
  if (
    normalized.endsWith("contract.ts") ||
    normalized.includes("facadeparity")
  ) {
    return true;
  }
  return false;
}

function hasAcceptedOutcomeShape(input: {
  definition: CommandInvariantDefinition;
  expression: ts.Expression;
}): boolean {
  if (!ts.isObjectLiteralExpression(input.expression)) {
    return false;
  }

  return input.expression.properties.some((property) => {
    if (!ts.isPropertyAssignment(property)) {
      return false;
    }
    const propertyName =
      ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)
        ? property.name.text
        : ts.isNumericLiteral(property.name)
          ? property.name.text
          : undefined;
    return propertyName !== undefined
      && input.definition.acceptedOutcomePropertyNames.includes(propertyName);
  });
}

function collectMatchEvidence(input: {
  definition: CommandInvariantDefinition;
  relativePath: string;
  fileContent: string;
}): { adapter: string[]; result: string[] } {
  if (isContractOnlyEvidencePath(input.relativePath)) {
    return {
      adapter: [],
      result: []
    };
  }

  const sourceFile = ts.createSourceFile(
    input.relativePath,
    input.fileContent,
    ts.ScriptTarget.Latest,
    true
  );
  const adapter = new Set<string>();
  const result = new Set<string>();
  const adapterAliasNames = new Set<string>();

  const lineOf = (node: ts.Node): number =>
    sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

  const propertyNameText = (name: ts.PropertyName): string | undefined => {
    if (ts.isIdentifier(name) || ts.isStringLiteral(name)) {
      return name.text;
    }
    if (ts.isNumericLiteral(name)) {
      return name.text;
    }
    return undefined;
  };

  const isDeliveryAdapterCall = (node: ts.CallExpression): boolean => {
    const expression = node.expression;
    if (ts.isIdentifier(expression)) {
      return input.definition.adapterNames.includes(expression.text);
    }
    if (ts.isPropertyAccessExpression(expression)) {
      return input.definition.adapterNames.includes(expression.name.text);
    }
    return false;
  };

  const expressionContainsDeliveryAdapterReference = (
    node: ts.Node
  ): boolean => {
    let found = false;
    const visitReference = (candidate: ts.Node): void => {
      if (found) {
        return;
      }
      if (
        ts.isIdentifier(candidate)
        && input.definition.adapterNames.includes(candidate.text)
      ) {
        found = true;
        return;
      }
      if (
        ts.isPropertyAccessExpression(candidate)
        && input.definition.adapterNames.includes(candidate.name.text)
      ) {
        found = true;
        return;
      }
      candidate.forEachChild(visitReference);
    };
    visitReference(node);
    return found;
  };

  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && node.initializer !== undefined
      && expressionContainsDeliveryAdapterReference(node.initializer)
    ) {
      adapterAliasNames.add(node.name.text);
    }

    if (ts.isCallExpression(node) && isDeliveryAdapterCall(node)) {
      adapter.add(`${input.relativePath}:${String(lineOf(node))} adapter`);
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      if (adapterAliasNames.has(node.expression.text)) {
        adapter.add(`${input.relativePath}:${String(lineOf(node))} adapter`);
      }
    }

    if (ts.isObjectLiteralExpression(node)) {
      for (const property of node.properties) {
        if (
          ts.isPropertyAssignment(property)
          && input.definition.resultPropertyNames.includes(
            propertyNameText(property.name) ?? ""
          )
          && hasAcceptedOutcomeShape({
            definition: input.definition,
            expression: property.initializer
          })
        ) {
          result.add(`${input.relativePath}:${String(lineOf(property))} result`);
          continue;
        }
      }
    }

    node.forEachChild(visit);
  };

  visit(sourceFile);

  return {
    adapter: [...adapter].sort((left, right) => left.localeCompare(right)),
    result: [...result].sort((left, right) => left.localeCompare(right))
  };
}

function summarizeInvariant(result: CommandInvariantResult): string {
  if (result.status === "covered") {
    const evidenceLine = result.evidence[0] ?? "evidence present";
    return `${result.command}: covered (${evidenceLine})`;
  }
  if (result.status === "missing") {
    return `${result.command}: missing delivery invariant evidence (adapter call OR explicit delivery result field).`;
  }
  return `${result.command}: absent command scope in current check scope.`;
}

function summarizeStatus(results: readonly CommandInvariantResult[]): {
  covered: number;
  missing: number;
  absent: number;
} {
  let covered = 0;
  let missing = 0;
  let absent = 0;
  for (const result of results) {
    if (result.status === "covered") {
      covered += 1;
      continue;
    }
    if (result.status === "missing") {
      missing += 1;
      continue;
    }
    absent += 1;
  }
  return { covered, missing, absent };
}

export async function buildCriticalSideEffectCheckReport({
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
      summary: "Critical side-effect check has no configured scope.",
      metric: check.metric,
      details: [
        "Set scope patterns in tools/fitness/policy.json for critical_side_effect check."
      ]
    };
  }

  const files = await resolveFilesForScopePatterns(
    repoRoot,
    buildCriticalSideEffectSearchScope(scope)
  );
  if (files.length === 0) {
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "warn",
      summary: "Critical side-effect check warning: no files matched current scope.",
      metric: check.metric,
      details: [`scope=${scope.join(", ")}`]
    };
  }

  const sourceByPath = new Map<string, string>();
  for (const absolutePath of files) {
    sourceByPath.set(
      absolutePath,
      await readFile(absolutePath, "utf8")
    );
  }

  const results: CommandInvariantResult[] = [];
  for (const definition of commandInvariantDefinitions) {
    const commandFiles = files.filter((absolutePath) =>
      commandFolderPatterns(definition).some((pattern) =>
        pattern.test(normalizePathToPosix(absolutePath))
      )
    );
    if (commandFiles.length === 0) {
      results.push({
        command: definition.command,
        status: "absent",
        evidence: []
      });
      continue;
    }

    const adapterEvidence: string[] = [];
    const resultEvidence: string[] = [];
    for (const absolutePath of commandFiles) {
      const relativePath = normalizePathToPosix(relative(repoRoot, absolutePath));
      const source = sourceByPath.get(absolutePath) ?? "";
      const evidence = collectMatchEvidence({
        definition,
        relativePath,
        fileContent: source
      });
      adapterEvidence.push(...evidence.adapter);
      resultEvidence.push(...evidence.result);
    }

    const combinedEvidence = [...adapterEvidence, ...resultEvidence];
    results.push({
      command: definition.command,
      status: combinedEvidence.length > 0 ? "covered" : "missing",
      evidence: combinedEvidence
    });
  }

  const summary = summarizeStatus(results);
  if (summary.missing > 0) {
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "fail",
      summary: `Critical side-effect check failed: ${String(summary.missing)} command invariant(s) missing (${String(summary.covered)} covered, ${String(summary.absent)} absent).`,
      metric: check.metric,
      details: results.map((result) => summarizeInvariant(result))
    };
  }

  if (summary.absent > 0) {
    return {
      id: check.id,
      owner: check.owner ?? "unknown",
      mode,
      status: "warn",
      summary: `Critical side-effect check warning: ${String(summary.absent)} command scope(s) absent (${String(summary.covered)} covered).`,
      metric: check.metric,
      details: results.map((result) => summarizeInvariant(result))
    };
  }

  return {
    id: check.id,
    owner: check.owner ?? "unknown",
    mode,
    status: "pass",
    summary: `Critical side-effect check passed: all ${String(summary.covered)} command invariant(s) covered.`,
    metric: check.metric,
    details: results.map((result) => summarizeInvariant(result))
  };
}
