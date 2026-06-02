import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

import type {
  UiServiceProcessInfo,
  UiServiceProcessStore,
  UiServiceReasonCode,
  UiServiceSpawnResult,
  UiServiceState,
  UiServiceStatus
} from "../../ports/uiServiceProcessStore.js";
import type {
  UiServiceCommand,
  UiServiceCommandOptions,
  UiServiceLifecycleResult
} from "./uiServiceLifecycleTypes.js";
import { buildChildCommand, optionsForExistingServiceEndpoint } from "./uiServiceLifecycleCommand.js";
import {
  buildEndpointMismatchResult,
  buildUiServiceStartFailureResult,
  buildUiServiceStopFailureResult,
  buildUiServiceUrl,
  endpointMatchesState
} from "./uiServiceLifecycleResults.js";

export type {
  UiServiceCommand,
  UiServiceCommandOptions,
  UiServiceLifecycleResult
} from "./uiServiceLifecycleTypes.js";

const stateVersion = 1;

function processMatchesState(
  state: UiServiceState,
  processInfo: UiServiceProcessInfo
): boolean {
  const normalizedCommand = processInfo.command.trim().replace(/\s+/gu, " ");
  const normalizedExpectedCommand = state.command.join(" ").trim().replace(/\s+/gu, " ");
  const tokenArgument = `--service-token ${state.identityToken}`;
  return (
    processInfo.processStartTime === state.processStartTime
    && (normalizedCommand === normalizedExpectedCommand
      || normalizedCommand.includes(tokenArgument))
  );
}

async function classifyState(input: {
  store: UiServiceProcessStore;
  statePath: string;
}): Promise<{
  status: UiServiceStatus;
  reasonCode: UiServiceReasonCode;
  state: UiServiceState | null;
  processInfo: UiServiceProcessInfo | null;
  message: string;
  exitCode: 0 | 1;
}> {
  const read = await input.store.readState(input.statePath);
  if (read.invalidReason !== undefined) {
    return {
      status: "invalid",
      reasonCode: "ui_service_invalid_state",
      state: null,
      processInfo: null,
      message: `UI service state is invalid: ${read.invalidReason}`,
      exitCode: 1
    };
  }
  if (read.state === null) {
    return {
      status: "stopped",
      reasonCode: "ui_service_not_running",
      state: null,
      processInfo: null,
      message: "Pairflow UI service is stopped.",
      exitCode: 0
    };
  }

  const processInfo = await input.store.inspectProcess(read.state.pid);
  if (processInfo === null) {
    return {
      status: "stale",
      reasonCode: "ui_service_stale_state",
      state: read.state,
      processInfo: null,
      message: `Pairflow UI service state is stale; recorded PID ${read.state.pid} is not running.`,
      exitCode: 0
    };
  }
  if (!processMatchesState(read.state, processInfo)) {
    return {
      status: "stale",
      reasonCode: "ui_service_identity_mismatch",
      state: read.state,
      processInfo,
      message: `Pairflow UI service state is stale; recorded PID ${read.state.pid} no longer matches Pairflow service identity.`,
      exitCode: 0
    };
  }

  return {
    status: "running",
    reasonCode: "ui_service_already_running",
    state: read.state,
    processInfo,
    message: `Pairflow UI service is running at ${read.state.url} (pid ${read.state.pid}).`,
    exitCode: 0
  };
}

function resultFromClassification(input: {
  command: UiServiceCommand;
  statePath: string;
  classified: Awaited<ReturnType<typeof classifyState>>;
}): UiServiceLifecycleResult {
  return {
    command: input.command,
    status: input.classified.status,
    reasonCode: input.classified.reasonCode,
    statePath: input.statePath,
    ...(input.classified.state?.stateVersion !== undefined
      ? { stateVersion: input.classified.state.stateVersion }
      : {}),
    ...(input.classified.state?.pid !== undefined
      ? { pid: input.classified.state.pid }
      : {}),
    ...(input.classified.state?.url !== undefined
      ? { url: input.classified.state.url }
      : {}),
    message: input.classified.message,
    exitCode: input.classified.exitCode
  };
}

function stoppedResult(input: {
  command: UiServiceCommand;
  statePath: string;
  state: UiServiceState;
}): UiServiceLifecycleResult {
  return {
    command: input.command,
    status: "stopped",
    reasonCode: "ui_service_stopped",
    statePath: input.statePath,
    pid: input.state.pid,
    url: input.state.url,
    message: `Pairflow UI service stopped (pid ${input.state.pid}).`,
    exitCode: 0
  };
}

async function startService(
  options: UiServiceCommandOptions,
  store: UiServiceProcessStore,
  statePath: string,
  replaceStale: boolean
): Promise<UiServiceLifecycleResult> {
  const classified = await classifyState({ store, statePath });
  if (classified.status === "invalid") {
    return resultFromClassification({ command: options.command, statePath, classified });
  }
  if (classified.status === "running") {
    return {
      ...resultFromClassification({
        command: options.command,
        statePath,
        classified
      }),
      reasonCode: "ui_service_already_running",
      exitCode: 1
    };
  }
  if (classified.status === "stale" && classified.processInfo !== null) {
    return {
      ...resultFromClassification({
        command: options.command,
        statePath,
        classified
      }),
      exitCode: 1
    };
  }
  if (classified.status === "stale" && replaceStale) {
    await store.removeState(statePath);
  }

  if (await store.isPortOpen(options.host, options.port)) {
    return {
      command: options.command,
      status: "unmanaged",
      reasonCode: "ui_service_unmanaged_port",
      statePath,
      url: buildUiServiceUrl(options.host, options.port),
      message: `Port ${options.port} on ${options.host} is already in use, but Pairflow state does not prove ownership.`,
      exitCode: 1
    };
  }

  const identityToken = `pairflow-ui-${randomUUID()}`;
  const childCommand = buildChildCommand(options, identityToken);
  let spawned: UiServiceSpawnResult;
  try {
    spawned = await store.spawnService({
      command: childCommand,
      cwd: options.repoPath,
      env: {},
      host: options.host,
      port: options.port
    });
  } catch (error) {
    return buildUiServiceStartFailureResult({
      command: options.command,
      statePath,
      host: options.host,
      port: options.port,
      error
    });
  }
  const state: UiServiceState = {
    pid: spawned.pid,
    repoPath: options.repoPath,
    host: options.host,
    port: options.port,
    url: buildUiServiceUrl(options.host, options.port),
    startedAt: (options.now ?? new Date()).toISOString(),
    command: childCommand,
    cwd: options.repoPath,
    executablePath: process.execPath,
    processStartTime: spawned.processStartTime,
    identityToken,
    stateVersion
  };
  try {
    await store.writeState(statePath, state);
  } catch (error) {
    try {
      await store.stopProcess(spawned.pid, state);
    } catch {
      // Preserve the state-write failure as the operator-facing error.
    }
    return buildUiServiceStartFailureResult({
      command: options.command,
      statePath,
      host: options.host,
      port: options.port,
      error
    });
  }

  return {
    command: options.command,
    status: "running",
    reasonCode: "ui_service_started",
    statePath,
    stateVersion,
    pid: state.pid,
    url: state.url,
    message: `Pairflow UI service started at ${state.url} (pid ${state.pid}).`,
    exitCode: 0
  };
}

async function stopService(input: {
  command: UiServiceCommand;
  store: UiServiceProcessStore;
  statePath: string;
  options: UiServiceCommandOptions;
  allowAlreadyStopped: boolean;
}): Promise<UiServiceLifecycleResult> {
  const classified = await classifyState({
    store: input.store,
    statePath: input.statePath
  });
  if (classified.status === "running" && classified.state !== null) {
    if (
      input.options.endpointFilter === true
      && !endpointMatchesState(input.options, classified.state)
    ) {
      return buildEndpointMismatchResult({
        command: input.command,
        store: input.store,
        statePath: input.statePath,
        options: input.options,
        state: classified.state
      });
    }
    try {
      await input.store.stopProcess(classified.state.pid, classified.state);
    } catch (error) {
      if (await input.store.inspectProcess(classified.state.pid) === null) {
        await input.store.removeState(input.statePath);
        return stoppedResult({
          command: input.command,
          statePath: input.statePath,
          state: classified.state
        });
      }
      return buildUiServiceStopFailureResult({
        command: input.command,
        statePath: input.statePath,
        state: classified.state,
        error
      });
    }
    await input.store.removeState(input.statePath);
    return stoppedResult({
      command: input.command,
      statePath: input.statePath,
      state: classified.state
    });
  }
  if (classified.status === "stopped" && input.allowAlreadyStopped) {
    if (await input.store.isPortOpen(input.options.host, input.options.port)) {
      return {
        command: input.command,
        status: "unmanaged",
        reasonCode: "ui_service_unmanaged_port",
        statePath: input.statePath,
        url: buildUiServiceUrl(input.options.host, input.options.port),
        message: `Port ${input.options.port} on ${input.options.host} is in use without Pairflow-owned UI service state.`,
        exitCode: 1
      };
    }
    return resultFromClassification({
      command: input.command,
      statePath: input.statePath,
      classified
    });
  }
  if (classified.status === "stale") {
    if (
      classified.state !== null
      && input.options.endpointFilter === true
      && !endpointMatchesState(input.options, classified.state)
    ) {
      return buildEndpointMismatchResult({
        command: input.command,
        store: input.store,
        statePath: input.statePath,
        options: input.options,
        state: classified.state
      });
    }
    if (classified.state !== null && classified.processInfo === null) {
      await input.store.removeState(input.statePath);
      return stoppedResult({
        command: input.command,
        statePath: input.statePath,
        state: classified.state
      });
    }
    return {
      ...resultFromClassification({
        command: input.command,
        statePath: input.statePath,
        classified
      }),
      exitCode: 1
    };
  }
  return resultFromClassification({
    command: input.command,
    statePath: input.statePath,
    classified
  });
}

export async function runUiServiceLifecycleCommand(
  options: UiServiceCommandOptions,
  store: UiServiceProcessStore
): Promise<UiServiceLifecycleResult> {
  const repoPath = resolve(options.repoPath);
  const normalizedOptions = { ...options, repoPath };
  const statePath = store.resolveStatePath(repoPath);
  if (normalizedOptions.command === "status") {
    return runLockedUiServiceLifecycleCommand(normalizedOptions, store, statePath);
  }
  return store.withStateLock(statePath, () =>
    runLockedUiServiceLifecycleCommand(normalizedOptions, store, statePath)
  );
}

async function runLockedUiServiceLifecycleCommand(
  options: UiServiceCommandOptions,
  store: UiServiceProcessStore,
  statePath: string
): Promise<UiServiceLifecycleResult> {
  if (options.command === "status") {
    if (!await store.waitForStateUnlock(statePath)) {
      return {
        command: options.command,
        status: "invalid",
        reasonCode: "ui_service_invalid_state",
        statePath,
        message: "UI service state is locked by an in-flight lifecycle command.",
        exitCode: 1
      };
    }
    const classified = await classifyState({ store, statePath });
    if (
      options.endpointFilter === true
      && classified.state !== null
      && !endpointMatchesState(options, classified.state)
    ) {
      return buildEndpointMismatchResult({
        command: options.command,
        store,
        statePath,
        options,
        state: classified.state
      });
    }
    if (
      classified.status === "stopped"
      && await store.isPortOpen(options.host, options.port)
    ) {
      return {
        command: options.command,
        status: "unmanaged",
        reasonCode: "ui_service_unmanaged_port",
        statePath,
        url: buildUiServiceUrl(options.host, options.port),
        message: `Port ${options.port} on ${options.host} is in use without Pairflow-owned UI service state.`,
        exitCode: 0
      };
    }
    return resultFromClassification({
      command: options.command,
      statePath,
      classified
    });
  }

  if (options.command === "start") {
    return startService(options, store, statePath, true);
  }

  if (options.command === "stop") {
    return stopService({
      command: options.command,
      store,
      statePath,
      options,
      allowAlreadyStopped: true
    });
  }

  const classified = await classifyState({ store, statePath });
  if (classified.status === "invalid") {
    return resultFromClassification({ command: options.command, statePath, classified });
  }
  let restartStartOptions = options;
  if (classified.status === "running") {
    const runningState = classified.state;
    if (runningState === null) {
      return resultFromClassification({ command: options.command, statePath, classified });
    }
    if (
      options.endpointFilter === true
      && !endpointMatchesState(options, runningState)
    ) {
      return buildEndpointMismatchResult({
        command: options.command,
        store,
        statePath,
        options,
        state: runningState
      });
    }
    const restartOptions = optionsForExistingServiceEndpoint(options, runningState);
    restartStartOptions = restartOptions;
    const stopped = await stopService({
      command: options.command,
      store,
      statePath,
      options: restartOptions,
      allowAlreadyStopped: false
    });
    if (stopped.status !== "stopped") {
      return stopped;
    }
  } else if (classified.status === "stale" && classified.processInfo === null) {
    await store.removeState(statePath);
  } else if (classified.status === "stale") {
    return {
      ...resultFromClassification({
        command: options.command,
        statePath,
        classified
      }),
      exitCode: 1
    };
  }
  return startService(restartStartOptions, store, statePath, true);
}
