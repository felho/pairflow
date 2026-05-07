import { parseArgs } from "node:util";

export interface BubbleStartCommandOptions {
  id: string;
  repo?: string;
  attach: boolean;
  help: false;
}

export interface BubbleStartHelpCommandOptions {
  help: true;
}

export type ParsedBubbleStartCommandOptions =
  | BubbleStartCommandOptions
  | BubbleStartHelpCommandOptions;

export function getBubbleStartHelpText(): string {
  return [
    "Usage:",
    "  pairflow bubble start --id <id> [--repo <path>] [--attach]",
    "  Starts CREATED bubbles or reattaches runtime-state bubbles after restart.",
    "",
    "Options:",
    "  --id <id>             Bubble id",
    "  --repo <path>         Optional repository path (defaults to cwd ancestry lookup)",
    "  --attach              Auto-attach/switch to the bubble tmux session after start (remote SSH bubbles reject this in Phase 2D)",
    "  -h, --help            Show this help"
  ].join("\n");
}

export function parseBubbleStartCommandOptions(
  args: string[]
): ParsedBubbleStartCommandOptions {
  const parsed = parseArgs({
    args,
    options: {
      id: {
        type: "string"
      },
      repo: {
        type: "string"
      },
      attach: {
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
    return { help: true };
  }

  const id = parsed.values.id;
  if (id === undefined) {
    throw new Error(
      "START_ID_REQUIRED: Missing required option: --id. context: command_name=start."
    );
  }

  return {
    id,
    ...(parsed.values.repo !== undefined ? { repo: parsed.values.repo } : {}),
    attach: parsed.values.attach ?? false,
    help: false
  };
}
