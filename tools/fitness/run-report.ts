#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

interface CliArgs {
  policy: string | undefined;
  out: string | undefined;
}

interface FitnessPolicyCheck {
  id: string;
  metric: string;
  mode: string | undefined;
  owner: string | undefined;
}

interface FitnessPolicy {
  defaults:
    | {
        mode: string | undefined;
      }
    | undefined;
  checks: FitnessPolicyCheck[];
}

interface FitnessReportCheck {
  id: string;
  owner: string;
  mode: string;
  status: "not_implemented" | "pass" | "warn" | "fail";
  summary: string;
  metric: string;
}

export interface FitnessReport {
  version: number;
  created_at: string;
  policy_path: string;
  checks: FitnessReportCheck[];
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export async function readPolicy(policyPath: string): Promise<FitnessPolicy> {
  const raw = await readFile(policyPath, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  if (!isRecord(parsed)) {
    throw new Error("Invalid fitness policy format.");
  }
  const checksRaw = parsed.checks;
  if (!Array.isArray(checksRaw)) {
    throw new Error("Invalid fitness policy format.");
  }
  const checks: FitnessPolicyCheck[] = checksRaw.map((check) => {
    if (!isRecord(check)) {
      throw new Error("Invalid fitness policy check entry.");
    }
    const id = asString(check.id);
    const metric = asString(check.metric);
    if (id === undefined || metric === undefined) {
      throw new Error("Fitness policy check must define string id and metric.");
    }
    return {
      id,
      metric,
      mode: asString(check.mode),
      owner: asString(check.owner)
    };
  });
  const defaults = isRecord(parsed.defaults)
    ? {
        mode: asString(parsed.defaults.mode)
      }
    : undefined;
  return {
    checks,
    defaults
  };
}

export function buildReport(
  policy: FitnessPolicy,
  policyPath: string
): FitnessReport {
  const createdAt = new Date().toISOString();
  const checks: FitnessReportCheck[] = policy.checks.map((check) => ({
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
}: {
  policyPath: string;
  outPath: string | undefined;
}): Promise<FitnessReport> {
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
