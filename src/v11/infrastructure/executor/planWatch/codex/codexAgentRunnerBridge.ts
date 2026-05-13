import type {
  AgentRunnerBuiltInBackendAdapter,
  AgentRunnerBridgeFailureReasonCode,
  AgentRunnerContinuationPayload,
  AgentRunnerArtifactFiles
} from "../../../../shared/planWatchRunner/agentRunnerBridgeContract.js";
import { prepareCodexRunnerArtifacts } from "./codexAgentRunnerArtifacts.js";
import { classifyCodexJsonProcessResult } from "./codexAgentRunnerBridgeResult.js";

export const CODEX_PLAN_WATCH_RUNNER_BACKEND = "codex";

export async function prepareCodexRunnerFiles(
  payload: AgentRunnerContinuationPayload,
  startedAt = new Date().toISOString()
): Promise<AgentRunnerArtifactFiles> {
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

export function createCodexPlanWatchRunnerBackendAdapter(input: {
  prepareRunnerFiles?: typeof prepareCodexRunnerFiles | undefined;
} = {}): AgentRunnerBuiltInBackendAdapter {
  const prepareRunnerFiles = input.prepareRunnerFiles ?? prepareCodexRunnerFiles;
  return {
    backend: CODEX_PLAN_WATCH_RUNNER_BACKEND,
    async prepareInvocationConfig(input) {
      const payloadValidation = validateContinuationPayload(input.payload);
      if (payloadValidation !== undefined) {
        return {
          ok: false,
          reasonCode: payloadValidation,
          payload: input.payload
        };
      }

      if (!(await input.pathExists(input.payload.repo_path))) {
        return {
          ok: false,
          reasonCode: "PLAN_WATCH_REPO_PATH_UNAVAILABLE",
          payload: input.payload
        };
      }
      if (!(await input.pathExists(input.payload.plan_path))) {
        return {
          ok: false,
          reasonCode: "PLAN_WATCH_PLAN_PATH_UNAVAILABLE",
          payload: input.payload
        };
      }

      let runnerArtifactFiles: AgentRunnerArtifactFiles;
      try {
        runnerArtifactFiles = await prepareRunnerFiles(
          input.payload,
          input.startedAt
        );
      } catch (error) {
        return {
          ok: false,
          reasonCode: "PLAN_WATCH_RUNNER_FILE_IO_FAILED",
          stderr: error instanceof Error ? error.message : String(error),
          payload: input.payload
        };
      }

      return {
        ok: true,
        config: {
          ...input.config,
          backend: CODEX_PLAN_WATCH_RUNNER_BACKEND,
          command: input.config.command?.trim() || "codex",
          args: buildCodexRunnerArgs({
            payload: input.payload,
            schemaFilePath: runnerArtifactFiles.schemaFilePath
          }),
          cwd: input.payload.repo_path,
          runnerArtifactFiles,
          inputMode: "none"
        }
      };
    },
    async classifyProcessResult(input) {
      const runnerArtifactFiles = input.config.runnerArtifactFiles;
      if (runnerArtifactFiles === undefined) {
        return {
          status: "blocked",
          invocationId: input.input.invocationId,
          startedAt: input.startedAt,
          completedAt: input.completedAt,
          reasonCode: "PLAN_WATCH_RUNNER_FILE_IO_FAILED",
          command: input.command,
          failureStage: "precondition",
          exitCode: input.processResult.exitCode,
          stdout: input.processResult.stdout,
          stderr: "Codex runner artifact files were not prepared.",
          payload: input.payload
        };
      }
      return classifyCodexJsonProcessResult({
        input: input.input,
        processResult: input.processResult,
        startedAt: input.startedAt,
        completedAt: input.completedAt,
        command: input.command,
        payload: input.payload,
        artifactFiles: runnerArtifactFiles
      });
    },
    classifySpawnErrorReasonCode(input) {
      return isUnavailableExecutableError(input.error)
        ? "PLAN_WATCH_CODEX_UNAVAILABLE"
        : undefined;
    }
  };
}

export const codexPlanWatchRunnerBackendAdapter =
  createCodexPlanWatchRunnerBackendAdapter();

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
