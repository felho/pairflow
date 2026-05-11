import { parseArgs } from "node:util";

export interface BubbleRestartCommandOptions {
  id: string;
  repo?: string;
  help: false;
}

export interface BubbleRestartHelpCommandOptions {
  help: true;
}

export type ParsedBubbleRestartCommandOptions =
  | BubbleRestartCommandOptions
  | BubbleRestartHelpCommandOptions;

export function getBubbleRestartHelpText(): string {
  return [
    "Usage:",
    "  pairflow bubble restart --id <id> [--repo <path>]",
    "",
    "Options:",
    "  --id <id>             Bubble id",
    "  --repo <path>         Optional repository path (defaults to cwd ancestry lookup)",
    "  -h, --help            Show this help",
    "",
    "Notes:",
    "  Restarts bubble runtime by terminating the existing tmux session/runtime ownership, then running bubble start."
  ].join("\n");
}

export function parseBubbleRestartCommandOptions(
  args: string[]
): ParsedBubbleRestartCommandOptions {
  const parsed = parseArgs({
    args,
    options: {
      id: {
        type: "string"
      },
      repo: {
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

  if (parsed.values.help ?? false) {
    return { help: true };
  }

  const id = parsed.values.id;
  if (id === undefined) {
    throw new Error(
      "RESTART_ID_REQUIRED: Missing required option: --id. context: command_name=restart."
    );
  }

  return {
    id,
    ...(parsed.values.repo !== undefined ? { repo: parsed.values.repo } : {}),
    help: false
  };
}
