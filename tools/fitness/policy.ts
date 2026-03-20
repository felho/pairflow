import { readFile } from "node:fs/promises";

import type {
  FitnessPolicy,
  FitnessPolicyCheck,
  FitnessPolicyException
} from "./types.js";

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

function asStringRecord(
  value: unknown
): Record<string, string> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const mapped: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry !== "string") {
      throw new Error("Fitness policy mode_by_milestone entries must be strings.");
    }
    mapped[key] = entry;
  }
  return mapped;
}

function parseException(rawException: unknown): FitnessPolicyException {
  if (!isRecord(rawException)) {
    throw new Error("Fitness policy exception entries must be objects.");
  }
  const id = asString(rawException.id);
  const kind = asString(rawException.kind);
  const owner = asString(rawException.owner);
  const reason = asString(rawException.reason);
  const expiresMilestone = asString(rawException.expires_milestone);
  if (
    id === undefined
    || kind === undefined
    || owner === undefined
    || reason === undefined
    || expiresMilestone === undefined
  ) {
    throw new Error(
      "Fitness policy exception must define id, kind, owner, reason, expires_milestone."
    );
  }
  return {
    id,
    kind,
    owner,
    reason,
    expires_milestone: expiresMilestone,
    from: asString(rawException.from),
    to: asString(rawException.to),
    paths: asStringArray(rawException.paths)
  };
}

function parseExceptions(value: unknown): FitnessPolicyException[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new Error("Fitness policy exceptions must be an array.");
  }
  return value.map((entry) => parseException(entry));
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
    mode_by_milestone: asStringRecord(rawCheck.mode_by_milestone),
    exception_lifecycle_mode: asString(rawCheck.exception_lifecycle_mode),
    owner: asString(rawCheck.owner),
    scope: asStringArray(rawCheck.scope),
    exceptions: parseExceptions(rawCheck.exceptions)
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
        mode: asString(parsed.defaults.mode),
        current_milestone: asString(parsed.defaults.current_milestone)
      }
    : undefined;
  return {
    checks,
    defaults
  };
}
