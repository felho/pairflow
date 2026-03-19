#!/usr/bin/env node

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { runReport } from "./run-report.mjs";

function parseArgs(argv) {
  const args = {
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

function shouldBlock(check) {
  const blockingMode = check.mode === "hard-fail";
  return blockingMode && check.status === "fail";
}

async function main() {
  const scriptDir = resolve(dirname(fileURLToPath(import.meta.url)));
  const repoRoot = resolve(scriptDir, "../..");
  const args = parseArgs(process.argv.slice(2));
  const policyPath = resolve(
    repoRoot,
    args.policy ?? "tools/fitness/policy.json"
  );
  const outPath = resolve(
    repoRoot,
    args.out ?? ".pairflow/evidence/fitness-report.json"
  );

  const report = await runReport({
    policyPath,
    outPath
  });

  const blockingFailures = report.checks.filter(shouldBlock);
  if (blockingFailures.length > 0) {
    process.stderr.write(
      `fitness:check blocked (${blockingFailures.length} hard-fail violation).\n`
    );
    process.exitCode = 1;
    return;
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
