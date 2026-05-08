import type {
  AgentRunnerBridgeFailureReasonCode,
  AgentRunnerContinuationPayload,
  CodexRunnerArtifactFiles
} from "./agentRunnerBridgeContract.js";
import { prepareCodexRunnerArtifacts } from "./codexAgentRunnerArtifacts.js";

export const CODEX_PLAN_WATCH_RUNNER_BACKEND = "codex";

export async function prepareCodexRunnerFiles(
  payload: AgentRunnerContinuationPayload,
  startedAt = new Date().toISOString()
): Promise<CodexRunnerArtifactFiles> {
  return prepareCodexRunnerArtifacts({
    payload,
    startedAt,
    mode: "codex_json"
  });
}

export function buildCodexRunnerArgs(input: {
  payload: AgentRunnerContinuationPayload;
  schemaFilePath: string;
}): string[] {
  return [
    "--dangerously-bypass-approvals-and-sandbox",
    "exec",
    "--json",
    "--cd",
    input.payload.repo_path,
    "--output-schema",
    input.schemaFilePath,
    buildExecutePairflowPlanPrompt(input.payload)
  ];
}

export function validateContinuationPayload(
  payload: AgentRunnerContinuationPayload
): AgentRunnerBridgeFailureReasonCode | undefined {
  if (payload.workflow !== "ExecutePairflowPlan") {
    return "PLAN_WATCH_RUNNER_WORKFLOW_UNSUPPORTED";
  }
  if (
    payload.kind !== "pairflow.execute_pairflow_plan.continuation"
    || !nonEmptyString(payload.invocation_id)
    || !nonEmptyString(payload.plan_path)
    || !nonEmptyString(payload.repo_path)
    || !nonEmptyString(payload.triggered_at)
    || Number.isNaN(Date.parse(payload.triggered_at))
    || !isRecord(payload.trigger)
  ) {
    return "PLAN_WATCH_RUNNER_PAYLOAD_INVALID";
  }
  return undefined;
}

export function isUnavailableExecutableError(error: unknown): boolean {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (code === "ENOENT") {
      return true;
    }
  }
  return false;
}

function buildExecutePairflowPlanPrompt(
  payload: AgentRunnerContinuationPayload
): string {
  return [
    "Use the ExecutePairflowPlan skill for this local Pairflow plan-watch continuation.",
    `Repository path: ${payload.repo_path}`,
    `Plan path: ${payload.plan_path}`,
    "Treat the plan file and repo-local plan/task/bubble metadata as the routing authority.",
    "Do not treat plan-watch trigger or ledger evidence as route, lifecycle, approval, or bubble-linkage authority.",
    "",
    "When you stop, emit exactly one JSON object matching the supplied output schema."
  ].join("\n");
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
