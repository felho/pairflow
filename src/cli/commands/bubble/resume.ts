import { parseArgs } from "node:util";

import {
  asResumeBubbleError,
  resumeBubble,
  type ResumeBubbleResult
} from "../../../core/bubble/resumeBubble.js";

export interface BubbleResumeCommandOptions {
  id: string;
  repo?: string;
  help: false;
}

export interface BubbleResumeHelpCommandOptions {
  help: true;
}

export type ParsedBubbleResumeCommandOptions =
  | BubbleResumeCommandOptions
  | BubbleResumeHelpCommandOptions;

export function getBubbleResumeHelpText(): string {
  return [
    "Usage:",
    "  pairflow bubble resume --id <id> [--repo <path>]",
    "",
    "Options:",
    "  --id <id>             Bubble id",
    "  --repo <path>         Optional repository path (defaults to cwd ancestry lookup)",
    "  -h, --help            Show this help",
    "",
    "Notes:",
    "  Emits HUMAN_REPLY with default resume message and transitions WAITING_HUMAN -> RUNNING."
  ].join("\n");
}

export function parseBubbleResumeCommandOptions(
  args: string[]
): ParsedBubbleResumeCommandOptions {
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

export async function runBubbleResumeCommand(
  args: string[],
  cwd: string = process.cwd()
): Promise<ResumeBubbleResult | null> {
  const options = parseBubbleResumeCommandOptions(args);
  if (options.help) {
    return null;
  }

  try {
    return await resumeBubble({
      bubbleId: options.id,
      repoPath: options.repo,
      cwd
    });
  } catch (error) {
    asResumeBubbleError(error);
  }
}
