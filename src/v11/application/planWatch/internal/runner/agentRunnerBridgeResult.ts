import type {
  AgentRunnerBridgeStatus,
  StructuredAgentRunnerOutput
} from "./agentRunnerBridgeContract.js";
import { asAgentRunnerBridgeRunnerReasonCode } from "./agentRunnerBridgeContract.js";

interface RawStructuredAgentRunnerOutput {
  status?: unknown;
  reason_code?: unknown;
  summary?: unknown;
  changed_artifacts?: unknown;
  route_ledger_summary?: unknown;
}

const allowedStatuses = new Set<AgentRunnerBridgeStatus>([
  "settled_checkpoint",
  "human_checkpoint",
  "blocked"
]);

export function parseStructuredAgentRunnerOutput(
  stdout: string
): StructuredAgentRunnerOutput | null {
  const candidates = uniqueCandidates([
    ...extractJsonObjectCandidates(stdout),
    ...extractLineCandidates(stdout)
  ]);

  for (const candidate of [...candidates].reverse()) {
    const parseResult = parseJson(candidate);
    if (!parseResult.ok) {
      continue;
    }
    const structuredOutput = parseStructuredAgentRunnerRecord(parseResult.value);
    if (structuredOutput !== null) {
      return structuredOutput;
    }
  }

  return null;
}

function uniqueCandidates(candidates: readonly string[]): string[] {
  return [...new Set(candidates)];
}

function extractLineCandidates(value: string): string[] {
  return value
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function parseJson(value: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(value) };
  } catch {
    return { ok: false };
  }
}

function extractJsonObjectCandidates(value: string): string[] {
  const candidates: string[] = [];
  const starts: number[] = [];
  let inString = false;
  let escaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      starts.push(index);
    } else if (char === "}") {
      const start = starts.pop();
      if (start !== undefined) {
        candidates.push(value.slice(start, index + 1).trim());
      }
    }
  }

  return candidates;
}

export function parseStructuredAgentRunnerRecord(
  parsed: unknown
): StructuredAgentRunnerOutput | null {
  if (!isRecord(parsed)) {
    return null;
  }

  const raw = parsed as RawStructuredAgentRunnerOutput;
  if (!isAgentRunnerBridgeStatus(raw.status)) {
    return null;
  }
  if (typeof raw.reason_code !== "string" || raw.reason_code.trim().length === 0) {
    return null;
  }

  const changedArtifacts = parseOptionalStringArray(raw.changed_artifacts);
  if (changedArtifacts === null) {
    return null;
  }

  if (
    raw.summary !== undefined &&
    raw.summary !== null &&
    typeof raw.summary !== "string"
  ) {
    return null;
  }
  if (
    raw.route_ledger_summary !== undefined &&
    raw.route_ledger_summary !== null &&
    typeof raw.route_ledger_summary !== "string"
  ) {
    return null;
  }

  return {
    status: raw.status,
    reasonCode: asAgentRunnerBridgeRunnerReasonCode(raw.reason_code),
    ...(raw.summary !== undefined && raw.summary !== null
      ? { summary: raw.summary }
      : {}),
    ...(changedArtifacts !== undefined ? { changedArtifacts } : {}),
    ...(raw.route_ledger_summary !== undefined && raw.route_ledger_summary !== null
      ? { routeLedgerSummary: raw.route_ledger_summary }
      : {})
  };
}

function parseOptionalStringArray(value: unknown): readonly string[] | undefined | null {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    return null;
  }
  if (!value.every((entry) => typeof entry === "string")) {
    return null;
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAgentRunnerBridgeStatus(
  value: unknown
): value is AgentRunnerBridgeStatus {
  return typeof value === "string" && allowedStatuses.has(value as AgentRunnerBridgeStatus);
}
