import { readFile } from "node:fs/promises";
import { relative } from "node:path";

import { normalizePathToPosix, resolveFilesForScopePatterns } from "../scope.js";
import type { FitnessPolicyCheck, FitnessReportCheck } from "../types.js";

type InvariantStatus = "covered" | "missing" | "absent";

interface CommandInvariantResult {
  command: "kickoff" | "pass" | "converged";
  status: InvariantStatus;
  evidence: string[];
}

const criticalCommands: readonly CommandInvariantResult["command"][] = [
  "kickoff",
  "pass",
  "converged"
] as const;

const deliveryAdapterPattern = /\bemitTmuxDeliveryNotification\b/u;
const deliveryResultPattern = /\bdelivery\s*:/u;

function commandFolderPattern(command: CommandInvariantResult["command"]): RegExp {
  return new RegExp(`/src/v11/application/${command}/`, "u");
}

function collectMatchEvidence(input: {
  relativePath: string;
  fileContent: string;
}): { adapter: string[]; result: string[] } {
  const adapter: string[] = [];
  const result: string[] = [];
  const lines = input.fileContent.split(/\r?\n/u);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();
    if (trimmed.startsWith("//")) {
      continue;
    }
    if (deliveryAdapterPattern.test(line)) {
      adapter.push(`${input.relativePath}:${String(index + 1)} adapter`);
    }
    if (deliveryResultPattern.test(line)) {
      result.push(`${input.relativePath}:${String(index + 1)} result`);
    }
  }
  return { adapter, result };
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

  const files = await resolveFilesForScopePatterns(repoRoot, scope);
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
  for (const command of criticalCommands) {
    const commandFiles = files.filter((absolutePath) =>
      commandFolderPattern(command).test(normalizePathToPosix(absolutePath))
    );
    if (commandFiles.length === 0) {
      results.push({
        command,
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
        relativePath,
        fileContent: source
      });
      adapterEvidence.push(...evidence.adapter);
      resultEvidence.push(...evidence.result);
    }

    const combinedEvidence = [...adapterEvidence, ...resultEvidence];
    results.push({
      command,
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
