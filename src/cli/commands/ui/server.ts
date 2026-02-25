import { parseArgs } from "node:util";

import {
  startUiServer,
  type UiServerHandle
} from "../../../core/ui/server.js";

export interface UiServerCommandOptions {
  repos: string[];
  host?: string | undefined;
  port?: number | undefined;
  assetsDir?: string | undefined;
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

export function getUiServerHelpText(): string {
  return [
    "Usage:",
    "  pairflow ui [--repo <path>]... [--host <host>] [--port <port>] [--assets-dir <path>]",
    "",
    "Options:",
    "  --repo <path>         Registry filter path (repeatable). Defaults to all repos in ~/.pairflow/repos.json.",
    "  --host <host>         Listening host (default: 127.0.0.1)",
    "  --port <port>         Listening port (default: 4173)",
    "  --assets-dir <path>   UI build output directory containing index.html",
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
    help: false
  };
}

export async function runUiServerCommand(
  args: string[],
  cwd: string = process.cwd(),
  dependencies: UiServerCommandDependencies = {}
): Promise<UiServerHandle | null> {
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
