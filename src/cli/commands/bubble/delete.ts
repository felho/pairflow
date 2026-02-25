import { parseArgs } from "node:util";

import {
  asDeleteBubbleError,
  deleteBubble,
  type DeleteBubbleResult
} from "../../../core/bubble/deleteBubble.js";

export interface BubbleDeleteCommandOptions {
  id: string;
  repo?: string;
  force: boolean;
  help: false;
}

export interface BubbleDeleteHelpCommandOptions {
  help: true;
}

export type ParsedBubbleDeleteCommandOptions =
  | BubbleDeleteCommandOptions
  | BubbleDeleteHelpCommandOptions;

export function getBubbleDeleteHelpText(): string {
  return [
    "Usage:",
    "  pairflow bubble delete --id <id> [--repo <path>] [--force]",
    "",
    "Options:",
    "  --id <id>             Bubble id",
    "  --repo <path>         Optional repository path (defaults to cwd ancestry lookup)",
    "  --force               Delete even when external artifacts still exist",
    "  -h, --help            Show this help",
    "",
    "Notes:",
    "  Without --force, command reports external artifacts and requires explicit confirmation.",
    "  With --force, command removes tmux/runtime/worktree/branch artifacts then deletes bubble definition.",
    "  Exit code is 2 when confirmation is required (deletion not yet performed)."
  ].join("\n");
}

export function parseBubbleDeleteCommandOptions(
  args: string[]
): ParsedBubbleDeleteCommandOptions {
  const parsed = parseArgs({
    args,
    options: {
      id: {
        type: "string"
      },
      repo: {
        type: "string"
      },
      force: {
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
    throw new Error("Missing required option: --id");
  }

  return {
    id,
    ...(parsed.values.repo !== undefined ? { repo: parsed.values.repo } : {}),
    force: parsed.values.force ?? false,
    help: false
  };
}

export async function runBubbleDeleteCommand(
  args: string[],
  cwd: string = process.cwd()
): Promise<DeleteBubbleResult | null> {
  const options = parseBubbleDeleteCommandOptions(args);
  if (options.help) {
    return null;
  }

  try {
    return await deleteBubble({
      bubbleId: options.id,
      repoPath: options.repo,
      cwd,
      force: options.force
    });
  } catch (error) {
    return asDeleteBubbleError(error);
  }
}
