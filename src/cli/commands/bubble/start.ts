import { parseArgs } from "node:util";

import {
  asStartBubbleError,
  startBubble,
  type StartBubbleResult
} from "../../../core/bubble/startBubble.js";

export interface BubbleStartCommandOptions {
  id: string;
  repo?: string;
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
    "  pairflow bubble start --id <id> [--repo <path>]",
    "  Starts CREATED bubbles or reattaches runtime-state bubbles after restart.",
    "",
    "Options:",
    "  --id <id>             Bubble id",
    "  --repo <path>         Optional repository path (defaults to cwd ancestry lookup)",
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

export async function runBubbleStartCommand(
  args: string[],
  cwd: string = process.cwd()
): Promise<StartBubbleResult | null> {
  const options = parseBubbleStartCommandOptions(args);
  if (options.help) {
    return null;
  }

  try {
    return await startBubble({
      bubbleId: options.id,
      repoPath: options.repo,
      cwd
    });
  } catch (error) {
    asStartBubbleError(error);
  }
}
