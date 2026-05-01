import type {
  AgentRunnerBridgeDependencies,
  AgentRunnerBridgeFailureReasonCode,
  AgentRunnerBridgeInput,
  AgentRunnerBridgeInputMode,
  AgentRunnerBridgeResult,
  AgentRunnerCommandConfig,
  AgentRunnerCommandIdentity,
  AgentRunnerContinuationPayload,
  AgentRunnerProcessInvocation,
  AgentRunnerProcessResult,
  RequiredAgentRunnerCommandConfig
} from "./agentRunnerBridgeContract.js";
import { parseStructuredAgentRunnerOutput } from "./agentRunnerBridgeResult.js";
import { agentRunnerBridgeDefaults } from "../../defaults/planWatch/agentRunnerBridgeDefaults.js";

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

type PreconditionResolution =
  | { ok: true; config: RequiredAgentRunnerCommandConfig }
  | { ok: false; result: AgentRunnerBridgeResult };

export function buildAgentRunnerContinuationPayload(
  input: AgentRunnerBridgeInput,
  now: Date = input.now ?? new Date()
): AgentRunnerContinuationPayload {
  return {
    kind: "pairflow.execute_pairflow_plan.continuation",
    workflow: "ExecutePairflowPlan",
    invocation_id: input.invocationId,
    plan_path: input.planPath,
    repo_path: input.repoPath,
    triggered_at: now.toISOString(),
    trigger: input.trigger
  };
}

export async function runExecutePairflowPlanContinuation(
  input: AgentRunnerBridgeInput,
  config: AgentRunnerCommandConfig,
  dependencies: AgentRunnerBridgeDependencies = agentRunnerBridgeDefaults
): Promise<AgentRunnerBridgeResult> {
  const clock = dependencies.now ?? (() => input.now ?? new Date());
  const startedAtDate = clock();
  const startedAt = startedAtDate.toISOString();

  const preconditions = await resolvePreconditions({
    input,
    config,
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
    input.now ?? startedAtDate
  );

  try {
    const processResult = await dependencies.runCommand(invocation.processInvocation);
    return classifyProcessResult({
      input,
      processResult,
      startedAt,
      completedAt: clock().toISOString(),
      command: invocation.commandIdentity,
      payload: invocation.payload
    });
  } catch (error) {
    return blocked({
      input,
      startedAt,
      completedAt: clock().toISOString(),
      reasonCode: "AGENT_RUNNER_SPAWN_FAILED",
      failureStage: "spawn",
      command: invocation.commandIdentity,
      stderr: error instanceof Error ? error.message : String(error),
      payload: invocation.payload
    });
  }
}

async function resolvePreconditions(input: {
  input: AgentRunnerBridgeInput;
  config: AgentRunnerCommandConfig;
  dependencies: AgentRunnerBridgeDependencies;
  startedAt: string;
  completedAt: () => string;
}): Promise<PreconditionResolution> {
  const command = input.config.command?.trim();
  if (command === undefined || command.length === 0) {
    return {
      ok: false,
      result: blocked({
        input: input.input,
        startedAt: input.startedAt,
        completedAt: input.completedAt(),
        reasonCode: "AGENT_RUNNER_CONFIG_MISSING",
        failureStage: "precondition",
        command: null
      })
    };
  }

  const planAvailable = await input.dependencies.pathExists(input.input.planPath);
  if (!planAvailable) {
    return {
      ok: false,
      result: blocked({
        input: input.input,
        startedAt: input.startedAt,
        completedAt: input.completedAt(),
        reasonCode: "PLAN_PATH_UNAVAILABLE",
        failureStage: "precondition",
        command: null
      })
    };
  }

  return {
    ok: true,
    config: {
      ...input.config,
      command
    }
  };
}

function buildRunnerInvocation(
  input: AgentRunnerBridgeInput,
  config: RequiredAgentRunnerCommandConfig,
  payloadTimestamp: Date
): {
  commandIdentity: AgentRunnerCommandIdentity;
  payload: AgentRunnerContinuationPayload;
  processInvocation: AgentRunnerProcessInvocation;
} {
  const command = config.command;
  const timeoutMs = input.timeoutMs ?? config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const inputMode = config.inputMode ?? "stdin_json";
  const cwd = config.cwd ?? input.repoPath;
  const payload = buildAgentRunnerContinuationPayload(input, payloadTimestamp);
  const args =
    inputMode === "arg_json"
      ? [...(config.args ?? []), JSON.stringify(payload)]
      : [...(config.args ?? [])];

  return {
    commandIdentity: buildCommandIdentity({
      command,
      args,
      cwd,
      inputMode,
      timeoutMs,
      env: config.env
    }),
    payload,
    processInvocation: {
      command,
      args,
      cwd,
      env: config.env,
      stdin: inputMode === "stdin_json" ? `${JSON.stringify(payload)}\n` : undefined,
      timeoutMs
    }
  };
}

function classifyProcessResult(input: {
  input: AgentRunnerBridgeInput;
  processResult: AgentRunnerProcessResult;
  startedAt: string;
  completedAt: string;
  command: AgentRunnerCommandIdentity;
  payload: AgentRunnerContinuationPayload;
}): AgentRunnerBridgeResult {
  if (input.processResult.timedOut) {
    return blocked({
      input: input.input,
      startedAt: input.startedAt,
      completedAt: input.completedAt,
      reasonCode: "AGENT_RUNNER_TIMEOUT",
      failureStage: "timeout",
      command: input.command,
      exitCode: input.processResult.exitCode,
      stdout: input.processResult.stdout,
      stderr: input.processResult.stderr,
      payload: input.payload
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
      payload: input.payload
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
      payload: input.payload
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

function buildCommandIdentity(input: {
  command: string;
  args: readonly string[];
  cwd: string;
  inputMode: AgentRunnerBridgeInputMode;
  timeoutMs: number;
  env?: Readonly<Record<string, string | undefined>> | undefined;
}): AgentRunnerCommandIdentity {
  return {
    command: input.command,
    args: input.args,
    cwd: input.cwd,
    inputMode: input.inputMode,
    timeoutMs: input.timeoutMs,
    envKeys: Object.keys(input.env ?? {}).sort()
  };
}

function blocked(input: {
  input: AgentRunnerBridgeInput;
  startedAt: string;
  completedAt: string;
  reasonCode: AgentRunnerBridgeFailureReasonCode;
  failureStage: AgentRunnerBridgeResult["failureStage"];
  command: AgentRunnerCommandIdentity | null;
  exitCode?: number | null | undefined;
  stdout?: string | undefined;
  stderr?: string | undefined;
  payload?: AgentRunnerContinuationPayload | undefined;
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
    ...(input.payload !== undefined ? { payload: input.payload } : {})
  };
}
