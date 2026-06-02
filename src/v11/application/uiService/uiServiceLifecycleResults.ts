import type {
  UiServiceProcessStore,
  UiServiceState
} from "../../ports/uiServiceProcessStore.js";
import type {
  UiServiceCommand,
  UiServiceCommandOptions,
  UiServiceLifecycleResult
} from "./uiServiceLifecycleTypes.js";

export function buildUiServiceUrl(host: string, port: number): string {
  const formattedHost =
    host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
  return `http://${formattedHost}:${port}`;
}

export function endpointMatchesState(
  options: UiServiceCommandOptions,
  state: UiServiceState
): boolean {
  const filterHost = options.endpointHostFilter ?? options.endpointFilter === true;
  const filterPort = options.endpointPortFilter ?? options.endpointFilter === true;
  return (
    (!filterHost || state.host === options.host)
    && (!filterPort || state.port === options.port)
  );
}

export function buildUiServiceStartFailureResult(input: {
  command: UiServiceCommand;
  statePath: string;
  host: string;
  port: number;
  error: unknown;
}): UiServiceLifecycleResult {
  const message = input.error instanceof Error ? input.error.message : String(input.error);
  return {
    command: input.command,
    status: "stopped",
    reasonCode: "ui_service_start_failed",
    statePath: input.statePath,
    url: buildUiServiceUrl(input.host, input.port),
    message: `Pairflow UI service failed to start: ${message}`,
    exitCode: 1
  };
}

export function buildUiServiceStopFailureResult(input: {
  command: UiServiceCommand;
  statePath: string;
  state: UiServiceState;
  error: unknown;
}): UiServiceLifecycleResult {
  const message = input.error instanceof Error ? input.error.message : String(input.error);
  return {
    command: input.command,
    status: "stale",
    reasonCode: "ui_service_stop_failed",
    statePath: input.statePath,
    stateVersion: input.state.stateVersion,
    pid: input.state.pid,
    url: input.state.url,
    message: `Pairflow UI service stop failed for pid ${input.state.pid}: ${message}`,
    exitCode: 1
  };
}

export async function buildEndpointMismatchResult(input: {
  command: UiServiceCommand;
  store: UiServiceProcessStore;
  statePath: string;
  options: UiServiceCommandOptions;
  state: UiServiceState;
}): Promise<UiServiceLifecycleResult> {
  const requestedUrl = buildUiServiceUrl(input.options.host, input.options.port);
  if (input.command === "restart") {
    return {
      command: input.command,
      status: "running",
      reasonCode: "ui_service_already_running",
      statePath: input.statePath,
      stateVersion: input.state.stateVersion,
      pid: input.state.pid,
      url: input.state.url,
      message: `Pairflow UI service is running at ${input.state.url}; refusing to restart different requested endpoint ${requestedUrl} while that state exists.`,
      exitCode: 1
    };
  }
  if (await input.store.isPortOpen(input.options.host, input.options.port)) {
    return {
      command: input.command,
      status: "unmanaged",
      reasonCode: "ui_service_unmanaged_port",
      statePath: input.statePath,
      url: requestedUrl,
      message: `Port ${input.options.port} on ${input.options.host} is in use without matching Pairflow-owned UI service state.`,
      exitCode: input.command === "status" ? 0 : 1
    };
  }
  return {
    command: input.command,
    status: "stopped",
    reasonCode: "ui_service_not_running",
    statePath: input.statePath,
    url: requestedUrl,
    message: `Pairflow UI service is stopped for ${requestedUrl}.`,
    exitCode: 0
  };
}
