import { parseArgs } from "node:util";

import {
  runUiServiceLifecycleCommand,
  type UiServiceCommand
} from "../../../v11/application/uiService/uiServiceLifecycle.js";
import {
  startUiServer,
  type UiServerHandle
} from "../../../v11/defaults/ui/serverDefaults.js";
import { createNodeUiServiceProcessStore } from "../../../v11/infrastructure/uiService/nodeUiServiceProcessStore.js";
import type {
  UiServiceLifecycleResult
} from "../../../v11/application/uiService/uiServiceLifecycle.js";
import type { UiServiceProcessStore } from "../../../v11/ports/uiServiceProcessStore.js";

export interface UiServerCommandOptions {
  repos: string[];
  host?: string | undefined;
  port?: number | undefined;
  assetsDir?: string | undefined;
  serviceToken?: string | undefined;
  help: false;
}

export interface UiServerHelpCommandOptions {
  repos: string[];
  help: true;
}

export type ParsedUiServerCommandOptions =
  | UiServerCommandOptions
  | UiServerHelpCommandOptions;

export interface UiServerCommandDependencies {
  startUiServer?: typeof startUiServer;
}

export interface UiServiceCommandOptions {
  lifecycleCommand: UiServiceCommand;
  repos: string[];
  host?: string | undefined;
  port?: number | undefined;
  endpointFilter: boolean;
  endpointHostFilter: boolean;
  endpointPortFilter: boolean;
  assetsDir?: string | undefined;
  json: boolean;
  help: false;
}

export interface UiServiceHelpCommandOptions {
  lifecycleCommand?: UiServiceCommand | undefined;
  help: true;
}

export type ParsedUiServiceCommandOptions =
  | UiServiceCommandOptions
  | UiServiceHelpCommandOptions;

export interface UiServiceCommandDependencies {
  processStore?: UiServiceProcessStore | undefined;
}

const lifecycleCommands = new Set(["start", "stop", "status", "restart"]);
const defaultHost = "127.0.0.1";
const defaultPort = 4173;

export function getUiServerHelpText(): string {
  return [
    "Usage:",
    "  pairflow ui [--repo <path>]... [--host <host>] [--port <port>] [--assets-dir <path>]",
    "  pairflow ui start [--repo <path>]... [--host <host>] [--port <port>] [--assets-dir <path>] [--json]",
    "  pairflow ui stop [--host <host>] [--port <port>] [--json]",
    "  pairflow ui status [--host <host>] [--port <port>] [--json]",
    "  pairflow ui restart [--repo <path>]... [--host <host>] [--port <port>] [--assets-dir <path>] [--json]",
    "",
    "Options:",
    "  --repo <path>         Registry filter path (repeatable). Defaults to all repos in ~/.pairflow/repos.json.",
    "  --host <host>         Listening host (default: 127.0.0.1)",
    "  --port <port>         Listening port (default: 4173)",
    "  --assets-dir <path>   UI build output directory containing index.html",
    "  --json                Print lifecycle command output as JSON",
    "  -h, --help            Show this help"
  ].join("\n");
}

export function parseUiServerCommandOptions(
  args: string[]
): ParsedUiServerCommandOptions {
  const parsed = parseArgs({
    args,
    options: {
      repo: {
        type: "string",
        multiple: true
      },
      host: {
        type: "string"
      },
      port: {
        type: "string"
      },
      "assets-dir": {
        type: "string"
      },
      "service-token": {
        type: "string"
      },
      help: {
        type: "boolean",
        short: "h"
      }
    },
    strict: true,
    allowPositionals: false
  });

  const repos = parsed.values.repo ?? [];
  if (parsed.values.help ?? false) {
    return {
      repos,
      help: true
    };
  }

  const portRaw = parsed.values.port;
  if (portRaw !== undefined) {
    const parsedPort = Number(portRaw);
    if (!Number.isInteger(parsedPort) || parsedPort < 0 || parsedPort > 65535) {
      throw new Error(`Invalid --port value: ${portRaw}`);
    }
  }

  return {
    repos,
    ...(parsed.values.host !== undefined ? { host: parsed.values.host } : {}),
    ...(portRaw !== undefined ? { port: Number(portRaw) } : {}),
    ...(parsed.values["assets-dir"] !== undefined
      ? { assetsDir: parsed.values["assets-dir"] }
      : {}),
    ...(parsed.values["service-token"] !== undefined
      ? { serviceToken: parsed.values["service-token"] }
      : {}),
    help: false
  };
}

export function isUiLifecycleCommand(args: string[]): boolean {
  return args[0] !== undefined && lifecycleCommands.has(args[0]);
}

export function assertSupportedUiCommand(args: string[]): void {
  const first = args[0];
  if (first !== undefined && !first.startsWith("-") && !lifecycleCommands.has(first)) {
    throw new Error(
      `Unknown pairflow ui subcommand: ${first}. Supported lifecycle subcommands: start, stop, status, restart.`
    );
  }
}

export function parseUiServiceCommandOptions(
  args: string[]
): ParsedUiServiceCommandOptions {
  const [lifecycleCommand, ...rest] = args;
  if (
    lifecycleCommand === undefined
    || !lifecycleCommands.has(lifecycleCommand)
  ) {
    throw new Error("Missing UI lifecycle subcommand.");
  }

  const parsed = parseArgs({
    args: rest,
    options: {
      repo: {
        type: "string",
        multiple: true
      },
      host: {
        type: "string"
      },
      port: {
        type: "string"
      },
      "assets-dir": {
        type: "string"
      },
      json: {
        type: "boolean"
      },
      help: {
        type: "boolean",
        short: "h"
      }
    },
    strict: true,
    allowPositionals: false
  });

  if (parsed.values.help ?? false) {
    return {
      lifecycleCommand: lifecycleCommand as UiServiceCommand,
      help: true
    };
  }

  if ((lifecycleCommand === "status" || lifecycleCommand === "stop")
    && parsed.values.repo !== undefined) {
    throw new Error(`--repo is not supported for pairflow ui ${lifecycleCommand}.`);
  }
  if ((lifecycleCommand === "status" || lifecycleCommand === "stop")
    && parsed.values["assets-dir"] !== undefined) {
    throw new Error(`--assets-dir is not supported for pairflow ui ${lifecycleCommand}.`);
  }

  const portRaw = parsed.values.port;
  if (portRaw !== undefined) {
    const parsedPort = Number(portRaw);
    if (!Number.isInteger(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
      throw new Error(`Invalid --port value: ${portRaw}`);
    }
  }

  return {
    lifecycleCommand: lifecycleCommand as UiServiceCommand,
    repos: parsed.values.repo ?? [],
    ...(parsed.values.host !== undefined ? { host: parsed.values.host } : {}),
    ...(portRaw !== undefined ? { port: Number(portRaw) } : {}),
    endpointFilter: parsed.values.host !== undefined || portRaw !== undefined,
    endpointHostFilter: parsed.values.host !== undefined,
    endpointPortFilter: portRaw !== undefined,
    ...(parsed.values["assets-dir"] !== undefined
      ? { assetsDir: parsed.values["assets-dir"] }
      : {}),
    json: parsed.values.json === true,
    help: false
  };
}

export function renderUiServiceLifecycleText(
  result: UiServiceLifecycleResult
): string {
  const details = [
    `status=${result.status}`,
    `reason=${result.reasonCode}`,
    ...(result.pid !== undefined ? [`pid=${result.pid}`] : []),
    ...(result.url !== undefined ? [`url=${result.url}`] : []),
    `state_path=${result.statePath}`
  ];
  return `${result.message}\n${details.join(" ")}\n`;
}

export async function runUiServiceCommand(
  args: string[],
  cwd: string = process.cwd(),
  cliEntrypoint: string = process.argv[1] ?? "",
  dependencies: UiServiceCommandDependencies = {}
): Promise<{
  result: UiServiceLifecycleResult;
  json: boolean;
} | null> {
  const options = parseUiServiceCommandOptions(args);
  if (options.help) {
    return null;
  }
  const store = dependencies.processStore ?? createNodeUiServiceProcessStore();
  const result = await runUiServiceLifecycleCommand(
    {
      command: options.lifecycleCommand,
      repoPath: cwd,
      repoFilters: options.repos,
      host: options.host ?? defaultHost,
      port: options.port ?? defaultPort,
      endpointFilter: options.endpointFilter,
      endpointHostFilter: options.endpointHostFilter,
      endpointPortFilter: options.endpointPortFilter,
      ...(options.assetsDir !== undefined ? { assetsDir: options.assetsDir } : {}),
      cliEntrypoint
    },
    store
  );
  return {
    result,
    json: options.json
  };
}

export async function runUiServerCommand(
  args: string[],
  cwd: string = process.cwd(),
  dependencies: UiServerCommandDependencies = {}
): Promise<UiServerHandle | null> {
  assertSupportedUiCommand(args);
  const options = parseUiServerCommandOptions(args);
  if (options.help) {
    return null;
  }

  const start = dependencies.startUiServer ?? startUiServer;
  return start({
    repoPaths: options.repos,
    ...(options.host !== undefined ? { host: options.host } : {}),
    ...(options.port !== undefined ? { port: options.port } : {}),
    ...(options.assetsDir !== undefined ? { assetsDir: options.assetsDir } : {}),
    cwd
  });
}
