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

export function resolveFitnessCheckPaths(input: {
  repoRoot: string;
  scanRepoRoot?: string | undefined;
  policyArg?: string | undefined;
  outArg?: string | undefined;
}): {
  policyPath: string;
  outPath: string;
  scanRepoRoot: string;
} {
  const scanRepoRoot =
    input.scanRepoRoot === undefined
      ? input.repoRoot
      : resolve(input.scanRepoRoot);
  return {
    policyPath: resolve(
      input.repoRoot,
      input.policyArg ?? "tools/fitness/policy.json"
    ),
    outPath:
      input.outArg === undefined
        ? resolve(scanRepoRoot, ".pairflow/evidence/fitness-report.json")
        : resolve(scanRepoRoot, input.outArg),
    scanRepoRoot
  };
}

export async function runFitnessCheck(input: {
  policyPath: string;
  outPath: string;
  repoRoot: string;
  stdout?: Pick<NodeJS.WriteStream, "write">;
  stderr?: Pick<NodeJS.WriteStream, "write">;
}): Promise<{ exitCode: 0 | 1; report: FitnessReport }> {
  const stdout = input.stdout ?? process.stdout;
  const stderr = input.stderr ?? process.stderr;
  const report = await runReport({
    policyPath: input.policyPath,
    outPath: input.outPath,
    repoRoot: input.repoRoot
  });

  const blockingFailures = report.checks.filter(shouldBlock);
  const softFailWarnings = report.checks.filter(isSoftFailWarning);
  if (blockingFailures.length > 0) {
    stderr.write(
      `fitness:check blocked (${blockingFailures.length} hard-fail violation).\n`
    );
    return { exitCode: 1, report };
  }

  if (softFailWarnings.length > 0) {
    stderr.write(
      `fitness:check soft-fail warnings (${softFailWarnings.length}) - merge allowed.\n`
    );
  }

  stdout.write(
    "fitness:check passed (no hard-fail violations in current report).\n"
  );
  return { exitCode: 0, report };
}

async function main() {
  const scriptDir = resolve(dirname(fileURLToPath(import.meta.url)));
  const repoRoot = resolve(scriptDir, "../..");
  const args = parseArgs(process.argv.slice(2));
  const paths = resolveFitnessCheckPaths({
    repoRoot,
    scanRepoRoot: process.env.PAIRFLOW_FITNESS_REPO_ROOT,
    policyArg: args.policy,
    outArg: args.out
  });
  const result = await runFitnessCheck({
    policyPath: paths.policyPath,
    outPath: paths.outPath,
    repoRoot: paths.scanRepoRoot
  });
  if (result.exitCode !== 0) {
    process.exitCode = 1;
  }
}

const isMainModule =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`fitness:check failed: ${message}\n`);
    process.exitCode = 1;
  });
}
