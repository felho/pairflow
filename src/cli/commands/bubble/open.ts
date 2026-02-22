import { parseArgs } from "node:util";

import {
  asOpenBubbleError,
  openBubble,
  type OpenBubbleResult
} from "../../../core/bubble/openBubble.js";

export interface BubbleOpenCommandOptions {
  id: string;
  repo?: string;
  help: false;
}

export interface BubbleOpenHelpCommandOptions {
  help: true;
}

export type ParsedBubbleOpenCommandOptions =
  | BubbleOpenCommandOptions
  | BubbleOpenHelpCommandOptions;

export function getBubbleOpenHelpText(): string {
  return [
    "Usage:",
    "  pairflow bubble open --id <id> [--repo <path>]",
    "",
    "Options:",
    "  --id <id>             Bubble id",
    "  --repo <path>         Optional repository path (defaults to cwd ancestry lookup)",
    "  -h, --help            Show this help",
    "",
    "Notes:",
    "  Executes bubble.toml open_command with {{worktree_path}} interpolation."
  ].join("\n");
}

export function parseBubbleOpenCommandOptions(
  args: string[]
): ParsedBubbleOpenCommandOptions {
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
    throw new Error("Missing required option: --id");
  }

  return {
    id,
    ...(parsed.values.repo !== undefined ? { repo: parsed.values.repo } : {}),
    help: false
  };
}

export async function runBubbleOpenCommand(
  args: string[],
  cwd: string = process.cwd()
): Promise<OpenBubbleResult | null> {
  const options = parseBubbleOpenCommandOptions(args);
  if (options.help) {
    return null;
  }

  try {
    return await openBubble({
      bubbleId: options.id,
      repoPath: options.repo,
      cwd
    });
  } catch (error) {
    asOpenBubbleError(error);
  }
}
