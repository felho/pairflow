#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

function isRecord(value) {
  return typeof value === "object" && value !== null;
}

export async function readPolicy(policyPath) {
  const raw = await readFile(policyPath, "utf8");
  const parsed = JSON.parse(raw);
  if (!isRecord(parsed) || !Array.isArray(parsed.checks)) {
    throw new Error("Invalid fitness policy format.");
  }
  return parsed;
}

export function buildReport(policy, policyPath) {
  const createdAt = new Date().toISOString();
  const checks = policy.checks.map((check) => ({
    id: check.id,
    owner: check.owner ?? "unknown",
    mode: check.mode ?? policy.defaults?.mode ?? "report-only",
    status: "not_implemented",
    summary: "Skeleton report item; metric runner is not wired yet.",
    metric: check.metric
  }));

  return {
    version: 1,
    created_at: createdAt,
    policy_path: policyPath,
    checks
  };
}

export async function runReport({
  policyPath,
  outPath
}) {
  const policy = await readPolicy(policyPath);
  const report = buildReport(policy, policyPath);
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
    outPath
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
