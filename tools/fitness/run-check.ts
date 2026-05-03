#!/usr/bin/env node

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { runReport, type FitnessReport } from "./run-report.js";

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

function shouldBlock(check: FitnessReport["checks"][number]): boolean {
  const blockingMode = check.mode === "hard-fail";
  return blockingMode && check.status === "fail";
}

function isSoftFailWarning(check: FitnessReport["checks"][number]): boolean {
  if (check.mode !== "soft-fail") {
    return false;
  }
  return check.status === "warn" || check.status === "fail";
}

async function main() {
  const scriptDir = resolve(dirname(fileURLToPath(import.meta.url)));
  const repoRoot = resolve(scriptDir, "../..");
  const scanRepoRoot =
    process.env.PAIRFLOW_FITNESS_REPO_ROOT === undefined
      ? repoRoot
      : resolve(process.env.PAIRFLOW_FITNESS_REPO_ROOT);
  const args = parseArgs(process.argv.slice(2));
  const policyPath = resolve(
    repoRoot,
    args.policy ?? "tools/fitness/policy.json"
  );
  const outPath =
    args.out === undefined
      ? resolve(scanRepoRoot, ".pairflow/evidence/fitness-report.json")
      : resolve(scanRepoRoot, args.out);
  const report = await runReport({
    policyPath,
    outPath,
    repoRoot: scanRepoRoot
  });

  const blockingFailures = report.checks.filter(shouldBlock);
  const softFailWarnings = report.checks.filter(isSoftFailWarning);
  if (blockingFailures.length > 0) {
    process.stderr.write(
      `fitness:check blocked (${blockingFailures.length} hard-fail violation).\n`
    );
    process.exitCode = 1;
    return;
  }

  if (softFailWarnings.length > 0) {
    process.stderr.write(
      `fitness:check soft-fail warnings (${softFailWarnings.length}) - merge allowed.\n`
    );
  }

  process.stdout.write(
    "fitness:check passed (no hard-fail violations in current report).\n"
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`fitness:check failed: ${message}\n`);
  process.exitCode = 1;
});
