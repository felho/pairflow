import { parseArgs } from "node:util";

export interface BubbleStatusCommandOptions {
  id: string;
  repo?: string;
  json: boolean;
  table: boolean;
  help: false;
}

export interface BubbleStatusHelpCommandOptions {
  help: true;
}

export type ParsedBubbleStatusCommandOptions =
  | BubbleStatusCommandOptions
  | BubbleStatusHelpCommandOptions;

export function getBubbleStatusHelpText(): string {
  return [
    "Usage:",
    "  pairflow bubble status --id <id> [--repo <path>] [--json] [--table]",
    "",
    "Options:",
    "  --id <id>             Bubble id",
    "  --repo <path>         Optional repository path (defaults to cwd ancestry lookup)",
    "  --json                Print structured JSON output",
    "  --table               Print compact table output (default)",
    "  -h, --help            Show this help"
  ].join("\n");
}

export function parseBubbleStatusCommandOptions(
  args: string[]
): ParsedBubbleStatusCommandOptions {
  const parsed = parseArgs({
    args,
    options: {
      id: {
        type: "string"
      },
      repo: {
        type: "string"
      },
      json: {
        type: "boolean"
      },
      table: {
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
      "STATUS_ID_REQUIRED: Missing required option: --id. context: command_name=status."
    );
  }

  return {
    id,
    ...(parsed.values.repo !== undefined ? { repo: parsed.values.repo } : {}),
    json: parsed.values.json ?? false,
    table: parsed.values.table ?? false,
    help: false
  };
}
