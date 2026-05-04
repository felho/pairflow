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
import {
  buildCodexRunnerArgs,
  CODEX_PLAN_WATCH_RUNNER_BACKEND,
  isUnavailableExecutableError,
  prepareCodexRunnerFiles,
  validateContinuationPayload
} from "./codexAgentRunnerBridge.js";
import { classifyCodexJsonProcessResult } from "./codexAgentRunnerBridgeResult.js";
import { parseStructuredAgentRunnerOutput } from "./agentRunnerBridgeResult.js";
import { agentRunnerBridgeDefaults } from "../../defaults/planWatch/agentRunnerBridgeDefaults.js";
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;
type PreconditionResolution =
  | { ok: true; config: RequiredAgentRunnerCommandConfig; payload: AgentRunnerContinuationPayload }
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
export async function runExecutePairflowPlanContinuation(
  input: AgentRunnerBridgeInput,
  config: AgentRunnerCommandConfig,
  dependencies: AgentRunnerBridgeDependencies = agentRunnerBridgeDefaults
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
  const invocation = buildRunnerInvocation(input, preconditions.config, preconditions.payload);
  if (preconditions.config.codexRunnerFiles !== undefined) await input.onArtifactFiles?.(preconditions.config.codexRunnerFiles);
  try {
    const processResult = await dependencies.runCommand(invocation.processInvocation);
    if (preconditions.config.codexRunnerFiles !== undefined) {
      return classifyCodexJsonProcessResult({
        input,
        processResult,
        startedAt,
        completedAt: clock().toISOString(),
        command: invocation.commandIdentity,
        payload: invocation.payload,
        artifactFiles: preconditions.config.codexRunnerFiles
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
        preconditions.config.backend === CODEX_PLAN_WATCH_RUNNER_BACKEND
          && isUnavailableExecutableError(error)
          ? "PLAN_WATCH_CODEX_UNAVAILABLE"
          : "AGENT_RUNNER_SPAWN_FAILED",
      failureStage: "spawn",
      command: invocation.commandIdentity,
      stderr: error instanceof Error ? error.message : String(error),
      payload: invocation.payload,
      artifactDir: preconditions.config.codexRunnerFiles?.artifactDirRef
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
  if (backend !== CODEX_PLAN_WATCH_RUNNER_BACKEND) {
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
  const repoAvailable = await input.dependencies.pathExists(input.payload.repo_path);
  if (!repoAvailable) {
    return {
      ok: false,
      result: blocked({
        input: input.input,
        startedAt: input.startedAt,
        completedAt: input.completedAt(),
        reasonCode: "PLAN_WATCH_REPO_PATH_UNAVAILABLE",
        failureStage: "precondition",
        command: null,
        payload: input.payload
      })
    };
  }
  const planAvailable = await input.dependencies.pathExists(input.payload.plan_path);
  if (!planAvailable) {
    return {
      ok: false,
      result: blocked({
        input: input.input,
        startedAt: input.startedAt,
        completedAt: input.completedAt(),
        reasonCode: "PLAN_WATCH_PLAN_PATH_UNAVAILABLE",
        failureStage: "precondition",
        command: null,
        payload: input.payload
      })
    };
  }
  const prepareFiles = input.dependencies.prepareCodexRunnerFiles ?? prepareCodexRunnerFiles;
  let codexRunnerFiles: Awaited<ReturnType<typeof prepareCodexRunnerFiles>>;
  try {
    codexRunnerFiles = await prepareFiles(input.payload, input.startedAt);
  } catch (error) {
    return {
      ok: false,
      result: blocked({
        input: input.input,
        startedAt: input.startedAt,
        completedAt: input.completedAt(),
        reasonCode: "PLAN_WATCH_RUNNER_FILE_IO_FAILED",
        failureStage: "precondition",
        command: null,
        stderr: error instanceof Error ? error.message : String(error),
        payload: input.payload
      })
    };
  }
  return {
    ok: true,
    payload: input.payload,
    config: {
      ...input.config,
      backend,
      command: input.config.command?.trim() || "codex",
      args: buildCodexRunnerArgs({
        payload: input.payload,
        schemaFilePath: codexRunnerFiles.schemaFilePath
      }),
      cwd: input.payload.repo_path,
      codexRunnerFiles,
      inputMode: "none"
    }
  };
}
function buildRunnerInvocation(
  input: AgentRunnerBridgeInput,
  config: RequiredAgentRunnerCommandConfig,
  payload: AgentRunnerContinuationPayload
): {
  commandIdentity: AgentRunnerCommandIdentity;
  payload: AgentRunnerContinuationPayload;
  processInvocation: AgentRunnerProcessInvocation;
} {
  const command = config.command;
  const timeoutMs = input.timeoutMs ?? config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const inputMode = config.inputMode ?? "stdin_json";
  const cwd = config.cwd ?? input.repoPath;
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
      timeoutMs,
      ...(config.codexRunnerFiles !== undefined
        ? { stdoutFilePath: config.codexRunnerFiles.eventsFilePath }
        : {}),
      ...(input.stopSignal !== undefined ? { signal: input.stopSignal } : {})
    }
  };
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
      reasonCode: "AGENT_RUNNER_TIMEOUT",
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
