import type {
  AgentRunnerBridgeInput,
  AgentRunnerBridgeInputMode,
  AgentRunnerCommandConfig,
  AgentRunnerCommandIdentity,
  AgentRunnerContinuationPayload,
  AgentRunnerProcessInvocation,
  RequiredAgentRunnerCommandConfig
} from "../../../shared/planWatchRunner/agentRunnerBridgeContract.js";
import { MAX_NODE_TIMER_DELAY_MS } from "../../../shared/timing/nodeTimerDelay.js";

export const DEFAULT_AGENT_RUNNER_IDLE_TIMEOUT_MS = 15 * 60 * 1000;

export interface AgentRunnerInvocationPolicy {
  commandIdentity: AgentRunnerCommandIdentity;
  payload: AgentRunnerContinuationPayload;
  processInvocation: AgentRunnerProcessInvocation;
}

export function resolveAgentRunnerIdleTimeoutMs(
  input: AgentRunnerBridgeInput,
  config: AgentRunnerCommandConfig
): number | undefined {
  const idleTimeoutMs =
    input.idleTimeoutMs
    ?? config.idleTimeoutMs
    ?? DEFAULT_AGENT_RUNNER_IDLE_TIMEOUT_MS;
  if (
    !Number.isInteger(idleTimeoutMs)
    || idleTimeoutMs <= 0
    || idleTimeoutMs > MAX_NODE_TIMER_DELAY_MS
  ) {
    return undefined;
  }
  return idleTimeoutMs;
}

export function buildRunnerInvocation(
  input: AgentRunnerBridgeInput,
  config: RequiredAgentRunnerCommandConfig,
  payload: AgentRunnerContinuationPayload,
  idleTimeoutMs: number
): AgentRunnerInvocationPolicy {
  const command = config.command;
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
      idleTimeoutMs,
      env: config.env
    }),
    payload,
    processInvocation: {
      command,
      args,
      cwd,
      env: config.env,
      stdin: inputMode === "stdin_json" ? `${JSON.stringify(payload)}\n` : undefined,
      idleTimeoutMs,
      ...(config.runnerArtifactFiles !== undefined
        ? { stdoutFilePath: config.runnerArtifactFiles.eventsFilePath }
        : {}),
      ...(input.stopSignal !== undefined ? { signal: input.stopSignal } : {})
    }
  };
}

function buildCommandIdentity(input: {
  command: string;
  args: readonly string[];
  cwd: string;
  inputMode: AgentRunnerBridgeInputMode;
  idleTimeoutMs: number;
  env?: Readonly<Record<string, string | undefined>> | undefined;
}): AgentRunnerCommandIdentity {
  return {
    command: input.command,
    args: input.args,
    cwd: input.cwd,
    inputMode: input.inputMode,
    idleTimeoutMs: input.idleTimeoutMs,
    envKeys: Object.keys(input.env ?? {}).sort()
  };
}
