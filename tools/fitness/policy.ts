import { readFile } from "node:fs/promises";

import type { FitnessPolicy, FitnessPolicyCheck } from "./types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const values: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") {
      return undefined;
    }
    values.push(entry);
  }
  return values;
}

function parseCheck(rawCheck: unknown): FitnessPolicyCheck {
  if (!isRecord(rawCheck)) {
    throw new Error("Invalid fitness policy check entry.");
  }
  const id = asString(rawCheck.id);
  const metric = asString(rawCheck.metric);
  if (id === undefined || metric === undefined) {
    throw new Error("Fitness policy check must define string id and metric.");
  }
  return {
    id,
    metric,
    mode: asString(rawCheck.mode),
    owner: asString(rawCheck.owner),
    scope: asStringArray(rawCheck.scope),
    exceptions: asStringArray(rawCheck.exceptions)
  };
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
  const checks = checksRaw.map((check) => parseCheck(check));
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
