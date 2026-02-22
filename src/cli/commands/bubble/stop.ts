import { parseArgs } from "node:util";

import {
  asStopBubbleError,
  stopBubble,
  type StopBubbleResult
} from "../../../core/bubble/stopBubble.js";

export interface BubbleStopCommandOptions {
  id: string;
  repo?: string;
  help: false;
}

export interface BubbleStopHelpCommandOptions {
  help: true;
}

export type ParsedBubbleStopCommandOptions =
  | BubbleStopCommandOptions
  | BubbleStopHelpCommandOptions;

export function getBubbleStopHelpText(): string {
  return [
    "Usage:",
    "  pairflow bubble stop --id <id> [--repo <path>]",
    "",
    "Options:",
    "  --id <id>             Bubble id",
    "  --repo <path>         Optional repository path (defaults to cwd ancestry lookup)",
    "  -h, --help            Show this help",
    "",
    "Notes:",
    "  Stops runtime session ownership and transitions bubble state to CANCELLED."
  ].join("\n");
}

export function parseBubbleStopCommandOptions(
  args: string[]
): ParsedBubbleStopCommandOptions {
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

export async function runBubbleStopCommand(
  args: string[],
  cwd: string = process.cwd()
): Promise<StopBubbleResult | null> {
  const options = parseBubbleStopCommandOptions(args);
  if (options.help) {
    return null;
  }

  try {
    return await stopBubble({
      bubbleId: options.id,
      repoPath: options.repo,
      cwd
    });
  } catch (error) {
    asStopBubbleError(error);
  }
}
