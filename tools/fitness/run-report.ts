#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { readPolicy } from "./policy.js";
import { buildReportChecks } from "./checks/index.js";

import type { FitnessPolicy, FitnessReport, FitnessReportCheck } from "./types.js";

interface CliArgs {
  policy: string | undefined;
  out: string | undefined;
}

function parseArgs(argv: readonly string[]): CliArgs {
  const args: CliArgs = {
    policy: undefined,
    out: undefined
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--policy") {
      args.policy = argv[index + 1];
      index += 1;
      continue;
    }
    if (token === "--out") {
      args.out = argv[index + 1];
      index += 1;
      continue;
    }
  }
  return args;
}

export function buildReport(
  policy: FitnessPolicy,
  policyPath: string,
  checks: FitnessReportCheck[]
): FitnessReport {
  const createdAt = new Date().toISOString();
  return {
    version: 1,
    created_at: createdAt,
    policy_path: policyPath,
    checks
  };
}

export async function runReport({
  policyPath,
  outPath,
  repoRoot
}: {
  policyPath: string;
  outPath: string | undefined;
  repoRoot?: string;
}): Promise<FitnessReport> {
  const resolvedRepoRoot = repoRoot ?? process.cwd();
  const policy = await readPolicy(policyPath);
  const checks = await buildReportChecks(policy, resolvedRepoRoot);
  const report = buildReport(policy, policyPath, checks);
  const reportText = JSON.stringify(report, null, 2);
  if (outPath !== undefined) {
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, reportText + "\n", "utf8");
  }
  process.stdout.write(reportText + "\n");
  return report;
}

async function main() {
  const scriptDir = resolve(dirname(fileURLToPath(import.meta.url)));
  const repoRoot = resolve(scriptDir, "../..");
  const args = parseArgs(process.argv.slice(2));
  const policyPath = resolve(
    repoRoot,
    args.policy ?? "tools/fitness/policy.json"
  );
  const outPath =
    args.out === undefined ? undefined : resolve(repoRoot, args.out);

  await runReport({
    policyPath,
    outPath,
    repoRoot
  });
}

const isMainModule =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`fitness:report failed: ${message}\n`);
    process.exitCode = 1;
  });
}

export type { FitnessReport } from "./types.js";
export { readPolicy } from "./policy.js";
export { buildReportChecks } from "./checks/index.js";
