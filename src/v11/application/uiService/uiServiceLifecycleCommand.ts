import type { UiServiceState } from "../../ports/uiServiceProcessStore.js";
import type { UiServiceCommandOptions } from "./uiServiceLifecycleTypes.js";

export function buildChildCommand(options: UiServiceCommandOptions, identityToken: string): string[] {
  const command = [
    process.execPath,
    options.cliEntrypoint,
    "ui",
    "--host",
    options.host,
    "--port",
    String(options.port),
    "--service-token",
    identityToken
  ];
  for (const repo of options.repoFilters) {
    command.push("--repo", repo);
  }
  if (options.assetsDir !== undefined) {
    command.push("--assets-dir", options.assetsDir);
  }
  return command;
}

export function optionsForExistingServiceEndpoint(
  options: UiServiceCommandOptions,
  state: UiServiceState
): UiServiceCommandOptions {
  return {
    ...options,
    host: options.endpointHostFilter === true ? options.host : state.host,
    port: options.endpointPortFilter === true ? options.port : state.port
  };
}
