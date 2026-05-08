import { spawn } from "node:child_process";

import { PAIRFLOW_REMOTE_CONFIG_INVALID, loadPairflowGlobalConfig } from "../../../../config/pairflowConfig.js";
import type {
  PairflowRemoteHostConfig
} from "../../../shared/remote/remoteExecutionTypes.js";
import { shellQuote } from "../../../shared/foundation/shellQuote.js";
import type {
  RemoteBubbleStatusSnapshot,
  RemoteBubbleStatusTarget
} from "../../../shared/status/remoteBubbleStatusContract.js";
import { SchemaValidationError } from "../../../shared/validation/primitives.js";
import {
  RemoteBubbleStatusError,
  toRemoteBubbleStatusError
} from "./sshBubbleStatusError.js";
import { normalizeRemoteBubbleStatusSnapshot } from "./sshBubbleStatusPayload.js";

const sshTransportOptions = [
  ["BatchMode", "yes"],
  ["StrictHostKeyChecking", "yes"],
  ["ConnectTimeout", "10"],
  ["ConnectionAttempts", "1"]
] as const;
const remoteStatusCommandTimeoutMsDefault = 15_000;
export const remoteStatusCommandAbortKillGraceMsDefault = 250;
export { RemoteBubbleStatusError };
export type { RemoteBubbleStatusSnapshot, RemoteBubbleStatusTarget };

export interface ResolveRemoteBubbleStatusTargetInput {
  bubbleId: string;
  remoteAlias: string;
  expectedHost?: string;
}

export interface ExecuteRemoteBubbleStatusInput {
  bubbleId: string;
  remoteClonePath: string;
  remoteTarget: RemoteBubbleStatusTarget;
}

export interface RemoteBubbleStatusDependencies {
  loadPairflowGlobalConfig?: typeof loadPairflowGlobalConfig;
  runCommand?: (
    command: string,
    args: string[],
    options?: {
      signal?: AbortSignal | undefined;
    }
  ) => Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }>;
  now?: () => Date;
  commandTimeoutMs?: number;
}

function buildSshTarget(input: { host: string; user?: string }): string {
  return input.user !== undefined ? `${input.user}@${input.host}` : input.host;
}

function buildSshTransportArgs(): string[] {
  return sshTransportOptions.flatMap(([key, value]) => ["-o", `${key}=${value}`]);
}

function buildSshCommandArgs(input: {
  target: string;
  script: string;
}): string[] {
  return [
    ...buildSshTransportArgs(),
    input.target,
    "bash",
    "-c",
    input.script
  ];
}

function assertSingleTokenPairflowCommand(command: string): string {
  if (command.trim().length === 0 || /\s/gu.test(command)) {
    throw toRemoteBubbleStatusError({
      code: "REMOTE_STATUS_CONFIG_INVALID",
      message:
        "Remote pairflow_command must be a single executable token without whitespace.",
      context: {
        command_name: "status",
        operation: "config",
        expected: "single_token_pairflow_command"
      }
    });
  }
  return command;
}

function createAbortError(): Error {
  const error = new Error("The operation was aborted.");
  error.name = "AbortError";
  return error;
}

export async function runCommandDefault(
  command: string,
  args: string[],
  options: {
    signal?: AbortSignal | undefined;
  } = {}
): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    let forceKillTimer: ReturnType<typeof setTimeout> | null = null;
    const clearForceKillTimer = (): void => {
      if (forceKillTimer === null) {
        return;
      }
      clearTimeout(forceKillTimer);
      forceKillTimer = null;
    };
    const clearAbortListener = (): void => {
      if (options.signal === undefined) {
        return;
      }
      options.signal.removeEventListener("abort", handleAbort);
    };
    const cleanup = (): void => {
      clearForceKillTimer();
      clearAbortListener();
    };
    const resolveOnce = (value: {
      stdout: string;
      stderr: string;
      exitCode: number;
    }): void => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolvePromise(value);
    };
    const rejectOnce = (error: unknown): void => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      rejectPromise(
        error instanceof Error ? error : new Error(String(error))
      );
    };
    const rejectAborted = (): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearAbortListener();
      rejectPromise(createAbortError());
    };
    const scheduleForceKill = (): void => {
      if (forceKillTimer !== null) {
        return;
      }
      forceKillTimer = setTimeout(() => {
        forceKillTimer = null;
        if (child.exitCode !== null || child.signalCode !== null) {
          return;
        }
        try {
          child.kill("SIGKILL");
        } catch {
          // Best-effort cleanup for transports that ignore SIGTERM.
        }
      }, remoteStatusCommandAbortKillGraceMsDefault);
      forceKillTimer.unref?.();
    };
    const handleAbort = (): void => {
      try {
        child.kill("SIGTERM");
      } catch {
        // Process may have already exited.
      }
      scheduleForceKill();
      rejectAborted();
    };
    if (options.signal?.aborted === true) {
      handleAbort();
      return;
    }
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", rejectOnce);
    child.on("close", (exitCode) => {
      cleanup();
      resolveOnce({
        stdout,
        stderr,
        exitCode: exitCode ?? 1
      });
    });
    options.signal?.addEventListener("abort", handleAbort, { once: true });
  });
}

function summarizeTransportOutput(output: string): string {
  const normalized = output.replace(/\s+/gu, " ").trim();
  if (normalized.length === 0) {
    return "<empty>";
  }
  return normalized.slice(0, 200);
}

function resolveRemoteHostConfig(input: {
  remoteAlias: string;
  globalConfig: { remotes?: Record<string, PairflowRemoteHostConfig> };
}): PairflowRemoteHostConfig {
  const remoteConfig = input.globalConfig.remotes?.[input.remoteAlias];
  if (remoteConfig === undefined) {
    throw toRemoteBubbleStatusError({
      code: "REMOTE_STATUS_CONFIG_INVALID",
      message:
        `${PAIRFLOW_REMOTE_CONFIG_INVALID}: Remote "${input.remoteAlias}" is not defined in the global [remotes.<name>] config.`,
      context: {
        command_name: "status",
        operation: "config",
        remote_alias: input.remoteAlias
      }
    });
  }
  return remoteConfig;
}

export async function resolveRemoteBubbleStatusTarget(
  input: ResolveRemoteBubbleStatusTargetInput,
  dependencies: Pick<RemoteBubbleStatusDependencies, "loadPairflowGlobalConfig"> = {}
): Promise<RemoteBubbleStatusTarget> {
  const loadGlobalConfig =
    dependencies.loadPairflowGlobalConfig ?? loadPairflowGlobalConfig;

  let globalConfig;
  try {
    globalConfig = await loadGlobalConfig();
  } catch (error) {
    if (error instanceof SchemaValidationError) {
      const message = error.message.startsWith(`${PAIRFLOW_REMOTE_CONFIG_INVALID}:`)
        ? error.message
        : `${PAIRFLOW_REMOTE_CONFIG_INVALID}: ${error.message}`;
      throw toRemoteBubbleStatusError({
        code: "REMOTE_STATUS_CONFIG_INVALID",
        message,
        context: {
          command_name: "status",
          bubble_id: input.bubbleId,
          remote_alias: input.remoteAlias,
          operation: "config"
        },
        cause: error
      });
    }
    const reason = error instanceof Error ? error.message : String(error);
    throw toRemoteBubbleStatusError({
      code: "REMOTE_STATUS_CONFIG_UNAVAILABLE",
      message:
        `Failed to load global Pairflow config for remote status of ${input.bubbleId}: ${reason}`,
      context: {
        command_name: "status",
        bubble_id: input.bubbleId,
        remote_alias: input.remoteAlias,
        operation: "config"
      },
      cause: error
    });
  }

  const remoteConfig = resolveRemoteHostConfig({
    remoteAlias: input.remoteAlias,
    globalConfig
  });
  if (input.expectedHost !== undefined && remoteConfig.host !== input.expectedHost) {
    throw toRemoteBubbleStatusError({
      code: "REMOTE_STATUS_CONFIG_INVALID",
      message:
        `Remote status for ${input.bubbleId} refused host mismatch: pointer host `
        + `(${input.expectedHost}) does not match configured execution host `
        + `(${remoteConfig.host}).`,
      context: {
        command_name: "status",
        bubble_id: input.bubbleId,
        remote_alias: input.remoteAlias,
        remote_host: remoteConfig.host,
        operation: "config"
      }
    });
  }

  return {
    alias: input.remoteAlias,
    host: remoteConfig.host,
    ...(remoteConfig.user !== undefined ? { user: remoteConfig.user } : {}),
    pairflowCommand: assertSingleTokenPairflowCommand(
      remoteConfig.pairflow_command ?? "pairflow"
    )
  };
}

export async function executeRemoteBubbleStatus(
  input: ExecuteRemoteBubbleStatusInput,
  dependencies: Omit<RemoteBubbleStatusDependencies, "loadPairflowGlobalConfig"> = {}
): Promise<RemoteBubbleStatusSnapshot> {
  const target = buildSshTarget({
    host: input.remoteTarget.host,
    ...(input.remoteTarget.user !== undefined
      ? { user: input.remoteTarget.user }
      : {})
  });
  const runCommand = dependencies.runCommand ?? runCommandDefault;
  const now = dependencies.now ?? (() => new Date());
  const commandTimeoutMs =
    dependencies.commandTimeoutMs ?? remoteStatusCommandTimeoutMsDefault;
  const script = [
    `cd ${shellQuote(input.remoteClonePath)}`,
    `${shellQuote(input.remoteTarget.pairflowCommand)} bubble status --id ${shellQuote(input.bubbleId)} --repo ${shellQuote(input.remoteClonePath)} --json`
  ].join(" && ");

  const abortController = new AbortController();
  let timedOut = false;
  const timeoutHandle = setTimeout(() => {
    timedOut = true;
    abortController.abort();
  }, commandTimeoutMs);

  let result;
  try {
    result = await runCommand(
      "ssh",
      buildSshCommandArgs({
        target,
        script
      }),
      {
        signal: abortController.signal
      }
    );
  } catch (error) {
    if (timedOut) {
      throw toRemoteBubbleStatusError({
        code: "REMOTE_STATUS_TRANSPORT_FAILED",
        message:
          `Remote status transport timed out for ${input.bubbleId} on ${input.remoteTarget.alias} `
          + `after ${commandTimeoutMs}ms.`,
        context: {
          command_name: "status",
          bubble_id: input.bubbleId,
          remote_alias: input.remoteTarget.alias,
          remote_host: input.remoteTarget.host,
          remote_clone_path: input.remoteClonePath,
          operation: "transport"
        },
        cause: error
      });
    }
    const reason = error instanceof Error ? error.message : String(error);
    throw toRemoteBubbleStatusError({
      code: "REMOTE_STATUS_TRANSPORT_FAILED",
      message:
        `Remote status transport failed for ${input.bubbleId} on ${input.remoteTarget.alias}: `
        + summarizeTransportOutput(reason),
      context: {
        command_name: "status",
        bubble_id: input.bubbleId,
        remote_alias: input.remoteTarget.alias,
        remote_host: input.remoteTarget.host,
        remote_clone_path: input.remoteClonePath,
        operation: "transport"
      },
      cause: error
    });
  } finally {
    clearTimeout(timeoutHandle);
  }

  if (result.exitCode !== 0) {
    throw toRemoteBubbleStatusError({
      code: "REMOTE_STATUS_TRANSPORT_FAILED",
      message:
        `Remote status transport failed for ${input.bubbleId} on ${input.remoteTarget.alias}: `
        + summarizeTransportOutput(result.stderr.trim().length > 0 ? result.stderr : result.stdout),
      context: {
        command_name: "status",
        bubble_id: input.bubbleId,
        remote_alias: input.remoteTarget.alias,
        remote_host: input.remoteTarget.host,
        remote_clone_path: input.remoteClonePath,
        operation: "transport"
      }
    });
  }

  const stdout = result.stdout.trim();
  let payload: unknown;
  try {
    payload = JSON.parse(stdout);
  } catch (error) {
    throw toRemoteBubbleStatusError({
      code: "REMOTE_STATUS_PAYLOAD_INVALID",
      message:
        `Remote status for ${input.bubbleId} returned invalid JSON: ${summarizeTransportOutput(stdout)}`,
      context: {
        command_name: "status",
        bubble_id: input.bubbleId,
        remote_alias: input.remoteTarget.alias,
        remote_host: input.remoteTarget.host,
        remote_clone_path: input.remoteClonePath,
        operation: "payload"
      },
      cause: error
    });
  }

  return normalizeRemoteBubbleStatusSnapshot({
    payload,
    lastCheckedAt: now().toISOString()
  });
}
