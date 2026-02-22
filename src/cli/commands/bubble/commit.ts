import { parseArgs } from "node:util";

import {
  asBubbleCommitError,
  commitBubble,
  type CommitBubbleResult
} from "../../../core/bubble/commitBubble.js";

export interface BubbleCommitCommandOptions {
  id: string;
  refs: string[];
  repo?: string;
  message?: string;
  help: false;
}

export interface BubbleCommitHelpCommandOptions {
  refs: string[];
  help: true;
}

export type ParsedBubbleCommitCommandOptions =
  | BubbleCommitCommandOptions
  | BubbleCommitHelpCommandOptions;

export function getBubbleCommitHelpText(): string {
  return [
    "Usage:",
    '  pairflow bubble commit --id <id> [--repo <path>] [--message "<text>"] [--ref <artifact-path>]...',
    "",
    "Options:",
    "  --id <id>             Bubble id",
    "  --repo <path>         Optional repository path (defaults to cwd ancestry lookup)",
    "  --message <text>      Optional git commit message override",
    "  --ref <path>          Optional artifact reference (repeatable)",
    "  -h, --help            Show this help",
    "",
    "Notes:",
    "  Requires READY done-package at artifacts/done-package.md and state APPROVED_FOR_COMMIT."
  ].join("\n");
}

export function parseBubbleCommitCommandOptions(
  args: string[]
): ParsedBubbleCommitCommandOptions {
  const parsed = parseArgs({
    args,
    options: {
      id: {
        type: "string"
      },
      repo: {
        type: "string"
      },
      message: {
        type: "string"
      },
      ref: {
        type: "string",
        multiple: true
      },
      help: {
        type: "boolean",
        short: "h"
      }
    },
    strict: true,
    allowPositionals: false
  });

  const refs = parsed.values.ref ?? [];
  if (parsed.values.help ?? false) {
    return {
      refs,
      help: true
    };
  }

  const id = parsed.values.id;
  if (id === undefined) {
    throw new Error("Missing required option: --id");
  }

  return {
    id,
    refs,
    ...(parsed.values.repo !== undefined ? { repo: parsed.values.repo } : {}),
    ...(parsed.values.message !== undefined ? { message: parsed.values.message } : {}),
    help: false
  };
}

export async function runBubbleCommitCommand(
  args: string[],
  cwd: string = process.cwd()
): Promise<CommitBubbleResult | null> {
  const options = parseBubbleCommitCommandOptions(args);
  if (options.help) {
    return null;
  }

  try {
    return await commitBubble({
      bubbleId: options.id,
      refs: options.refs,
      repoPath: options.repo,
      message: options.message,
      cwd
    });
  } catch (error) {
    asBubbleCommitError(error);
  }
}
