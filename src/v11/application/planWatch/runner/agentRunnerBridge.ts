import type {
  AgentRunnerBridgeDependencies,
  AgentRunnerBridgeFailureReasonCode,
  AgentRunnerBuiltInBackendAdapter,
  AgentRunnerBridgeInput,
  AgentRunnerBridgeResult,
  AgentRunnerCommandConfig,
  AgentRunnerCommandIdentity,
  AgentRunnerContinuationPayload,
  AgentRunnerProcessResult,
  RequiredAgentRunnerCommandConfig
} from "../../../shared/planWatchRunner/agentRunnerBridgeContract.js";
import { parseStructuredAgentRunnerOutput } from "../../../shared/planWatchRunner/agentRunnerBridgeResult.js";
import {
  buildRunnerInvocation,
  DEFAULT_AGENT_RUNNER_IDLE_TIMEOUT_MS,
  resolveAgentRunnerIdleTimeoutMs
} from "./agentRunnerInvocationPolicy.js";
export { DEFAULT_AGENT_RUNNER_IDLE_TIMEOUT_MS };
type PreconditionResolution =
  | {
      ok: true;
      config: RequiredAgentRunnerCommandConfig;
      payload: AgentRunnerContinuationPayload;
      backendAdapter?: AgentRunnerBuiltInBackendAdapter | undefined;
    }
  | { ok: false; result: AgentRunnerBridgeResult };
export function buildAgentRunnerContinuationPayload(
  input: AgentRunnerBridgeInput,
  now: Date = input.now ?? new Date()
): AgentRunnerContinuationPayload {
  return {
    kind: "pairflow.execute_pairflow_plan.continuation",
    workflow: input.workflow ?? "ExecutePairflowPlan",
    invocation_id: input.invocationId,
    plan_path: input.planPath,
    repo_path: input.repoPath,
    triggered_at: now.toISOString(),
    trigger: input.trigger
  };
}

function validateContinuationPayload(
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

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function runExecutePairflowPlanContinuation(
  input: AgentRunnerBridgeInput,
  config: AgentRunnerCommandConfig,
  dependencies: AgentRunnerBridgeDependencies
): Promise<AgentRunnerBridgeResult> {
  const clock = dependencies.now ?? (() => input.now ?? new Date());
  const startedAtDate = clock();
  const startedAt = startedAtDate.toISOString();
  const payload = buildAgentRunnerContinuationPayload(input, input.now ?? startedAtDate);
  if (input.stopSignal?.aborted) {
    return blocked({
      input,
      startedAt,
      completedAt: clock().toISOString(),
      reasonCode: "AGENT_RUNNER_ABORTED",
      failureStage: "abort",
      command: null,
      exitCode: null,
      payload
    });
  }
  const idleTimeoutMs = resolveAgentRunnerIdleTimeoutMs(input, config);
  if (idleTimeoutMs === undefined) {
    return blocked({
      input,
      startedAt,
      completedAt: clock().toISOString(),
      reasonCode: "PLAN_WATCH_RUNNER_PAYLOAD_INVALID",
      failureStage: "precondition",
      command: null,
      payload
    });
  }
  const preconditions = await resolvePreconditions({
    input,
    config,
    payload,
    dependencies,
    startedAt,
    completedAt: () => clock().toISOString()
  });
  if (!preconditions.ok) {
    return preconditions.result;
  }
  const invocation = buildRunnerInvocation(
    input,
    preconditions.config,
    preconditions.payload,
    idleTimeoutMs
  );
  if (preconditions.config.runnerArtifactFiles !== undefined) await input.onArtifactFiles?.(preconditions.config.runnerArtifactFiles);
  try {
    const processResult = await dependencies.runCommand(invocation.processInvocation);
    if (preconditions.backendAdapter !== undefined) {
      return preconditions.backendAdapter.classifyProcessResult({
        input,
        processResult,
        startedAt,
        completedAt: clock().toISOString(),
        command: invocation.commandIdentity,
        payload: invocation.payload,
        config: preconditions.config
      });
    }
    if (processResult.aborted || processResult.timedOut || processResult.exitCode !== 0) {
      return classifyProcessResult({
        input,
        processResult,
        startedAt,
        completedAt: clock().toISOString(),
        command: invocation.commandIdentity,
        payload: invocation.payload
      });
    }
    const completedAt = clock().toISOString();
    return classifyProcessResult({
      input,
      processResult,
      startedAt,
      completedAt,
      command: invocation.commandIdentity,
      payload: invocation.payload
    });
  } catch (error) {
    return blocked({
      input,
      startedAt,
      completedAt: clock().toISOString(),
      reasonCode:
        preconditions.backendAdapter?.classifySpawnErrorReasonCode?.({
          error,
          config: preconditions.config
        }) ?? "AGENT_RUNNER_SPAWN_FAILED",
      failureStage: "spawn",
      command: invocation.commandIdentity,
      stderr: error instanceof Error ? error.message : String(error),
      payload: invocation.payload,
      artifactDir: preconditions.config.runnerArtifactFiles?.artifactDirRef
    });
  }
}
async function resolvePreconditions(input: {
  input: AgentRunnerBridgeInput;
  config: AgentRunnerCommandConfig;
  payload: AgentRunnerContinuationPayload;
  dependencies: AgentRunnerBridgeDependencies;
  startedAt: string;
  completedAt: () => string;
}): Promise<PreconditionResolution> {
  if (input.config.backend !== undefined) {
    return resolveBuiltInRunnerPreconditions(input);
  }
  const command = input.config.command?.trim();
  if (command === undefined || command.length === 0) {
    return {
      ok: false,
      result: blocked({
        input: input.input,
        startedAt: input.startedAt,
        completedAt: input.completedAt(),
        reasonCode: "PLAN_WATCH_RUNNER_CONFIG_MISSING",
        failureStage: "precondition",
        command: null
      })
    };
  }
  const payloadValidation = validateContinuationPayload(input.payload);
  if (payloadValidation !== undefined) {
    return {
      ok: false,
      result: blocked({
        input: input.input,
        startedAt: input.startedAt,
        completedAt: input.completedAt(),
        reasonCode: payloadValidation,
        failureStage: "precondition",
        command: null,
        payload: input.payload
      })
    };
  }
  const requiredPaths: Array<{ path: string; reasonCode: AgentRunnerBridgeFailureReasonCode }> = [
    { path: input.input.repoPath, reasonCode: "PLAN_WATCH_REPO_PATH_UNAVAILABLE" },
    { path: input.input.planPath, reasonCode: "PLAN_WATCH_PLAN_PATH_UNAVAILABLE" }
  ];
  for (const requiredPath of requiredPaths) {
    if (!(await input.dependencies.pathExists(requiredPath.path))) {
      return {
        ok: false,
        result: blocked({
          input: input.input,
          startedAt: input.startedAt,
          completedAt: input.completedAt(),
          reasonCode: requiredPath.reasonCode,
          failureStage: "precondition",
          command: null
        })
      };
    }
  }
  return {
    ok: true,
    payload: input.payload,
    config: {
      ...input.config,
      command
    }
  };
}
async function resolveBuiltInRunnerPreconditions(input: {
  input: AgentRunnerBridgeInput;
  config: AgentRunnerCommandConfig;
  payload: AgentRunnerContinuationPayload;
  dependencies: AgentRunnerBridgeDependencies;
  startedAt: string;
  completedAt: () => string;
}): Promise<PreconditionResolution> {
  const backend = input.config.backend?.trim();
  if (backend === undefined || backend.length === 0) {
    return {
      ok: false,
      result: blocked({
        input: input.input,
        startedAt: input.startedAt,
        completedAt: input.completedAt(),
        reasonCode: "PLAN_WATCH_RUNNER_CONFIG_MISSING",
        failureStage: "precondition",
        command: null
      })
    };
  }
  const backendAdapter = input.dependencies.builtInBackends?.find(
    (adapter) => adapter.backend === backend
  );
  if (backendAdapter === undefined) {
    return {
      ok: false,
      result: blocked({
        input: input.input,
        startedAt: input.startedAt,
        completedAt: input.completedAt(),
        reasonCode: "PLAN_WATCH_RUNNER_BACKEND_UNSUPPORTED",
        failureStage: "precondition",
        command: null
      })
    };
  }
  const prepared = await backendAdapter.prepareInvocationConfig({
    input: input.input,
    config: input.config,
    payload: input.payload,
    pathExists: input.dependencies.pathExists,
    startedAt: input.startedAt
  });
  if (!prepared.ok) {
    return {
      ok: false,
      result: blocked({
        input: input.input,
        startedAt: input.startedAt,
        completedAt: input.completedAt(),
        reasonCode: prepared.reasonCode,
        failureStage: "precondition",
        command: null,
        ...(prepared.stderr !== undefined ? { stderr: prepared.stderr } : {}),
        payload: prepared.payload ?? input.payload
      })
    };
  }
  return {
    ok: true,
    payload: input.payload,
    config: prepared.config,
    backendAdapter
  };
}
function timeoutReasonCode(
  processResult: AgentRunnerProcessResult
): AgentRunnerBridgeFailureReasonCode {
  return processResult.timeoutKind === "idle"
    ? "AGENT_RUNNER_IDLE_TIMEOUT"
    : "AGENT_RUNNER_TIMEOUT";
}

function classifyProcessResult(input: {
  input: AgentRunnerBridgeInput;
  processResult: AgentRunnerProcessResult;
  startedAt: string;
  completedAt: string;
  command: AgentRunnerCommandIdentity;
  payload: AgentRunnerContinuationPayload; artifactDir?: string | undefined;
}): AgentRunnerBridgeResult {
  if (input.processResult.aborted) {
    return blocked({
      input: input.input,
      startedAt: input.startedAt,
      completedAt: input.completedAt,
      reasonCode: "AGENT_RUNNER_ABORTED",
      failureStage: "abort",
      command: input.command,
      exitCode: input.processResult.exitCode,
      stdout: input.processResult.stdout,
      stderr: input.processResult.stderr,
      payload: input.payload,
      artifactDir: input.artifactDir
    });
  }
  if (input.processResult.timedOut) {
    return blocked({
      input: input.input,
      startedAt: input.startedAt,
      completedAt: input.completedAt,
      reasonCode: timeoutReasonCode(input.processResult),
      failureStage: "timeout",
      command: input.command,
      exitCode: input.processResult.exitCode,
      stdout: input.processResult.stdout,
      stderr: input.processResult.stderr,
      payload: input.payload,
      artifactDir: input.artifactDir
    });
  }
  if (input.processResult.exitCode === null) {
    return blocked({
      input: input.input,
      startedAt: input.startedAt,
      completedAt: input.completedAt,
      reasonCode: "AGENT_RUNNER_NON_ZERO_EXIT",
      failureStage: "exit",
      command: input.command,
      exitCode: input.processResult.exitCode,
      stdout: input.processResult.stdout,
      stderr: input.processResult.stderr,
      payload: input.payload,
      artifactDir: input.artifactDir
    });
  }
  if (input.processResult.exitCode !== 0) {
    return blocked({
      input: input.input,
      startedAt: input.startedAt,
      completedAt: input.completedAt,
      reasonCode: "AGENT_RUNNER_NON_ZERO_EXIT",
      failureStage: "exit",
      command: input.command,
      exitCode: input.processResult.exitCode,
      stdout: input.processResult.stdout,
      stderr: input.processResult.stderr,
      payload: input.payload,
      artifactDir: input.artifactDir
    });
  }
  const structuredOutput = parseStructuredAgentRunnerOutput(input.processResult.stdout);
  if (structuredOutput === null) {
    return blocked({
      input: input.input,
      startedAt: input.startedAt,
      completedAt: input.completedAt,
      reasonCode: "AGENT_RUNNER_OUTPUT_INVALID",
      failureStage: "output",
      command: input.command,
      exitCode: input.processResult.exitCode,
      stdout: input.processResult.stdout,
      stderr: input.processResult.stderr,
      payload: input.payload
    });
  }
  return {
    status: structuredOutput.status,
    invocationId: input.input.invocationId,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    reasonCode: structuredOutput.reasonCode,
    command: input.command,
    exitCode: input.processResult.exitCode,
    stdout: input.processResult.stdout,
    stderr: input.processResult.stderr,
    ...(structuredOutput.summary !== undefined
      ? { runnerSummary: structuredOutput.summary }
      : {}),
    ...(structuredOutput.changedArtifacts !== undefined
      ? { changedArtifacts: structuredOutput.changedArtifacts }
      : {}),
    ...(structuredOutput.routeLedgerSummary !== undefined
      ? { routeLedgerSummary: structuredOutput.routeLedgerSummary }
      : {}),
    payload: input.payload
  };
}

function blocked(input: {
  input: AgentRunnerBridgeInput;
  startedAt: string;
  completedAt: string;
  reasonCode: AgentRunnerBridgeFailureReasonCode;
  failureStage: AgentRunnerBridgeResult["failureStage"];
  command: AgentRunnerCommandIdentity | null;
  exitCode?: number | null | undefined; stdout?: string | undefined;
  stderr?: string | undefined; payload?: AgentRunnerContinuationPayload | undefined;
  artifactDir?: string | undefined;
}): AgentRunnerBridgeResult {
  return {
    status: "blocked",
    invocationId: input.input.invocationId,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    reasonCode: input.reasonCode,
    command: input.command,
    failureStage: input.failureStage,
    ...(input.exitCode !== undefined ? { exitCode: input.exitCode } : {}),
    ...(input.stdout !== undefined ? { stdout: input.stdout } : {}),
    ...(input.stderr !== undefined ? { stderr: input.stderr } : {}),
    ...(input.artifactDir !== undefined ? { artifactDir: input.artifactDir } : {}),
    ...(input.payload !== undefined ? { payload: input.payload } : {})
  };
}
