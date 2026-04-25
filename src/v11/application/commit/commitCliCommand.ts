import { parseArgs } from "node:util";

import { commitBubbleDependencyDefaults } from "./commitCommandDefaults.js";
import {
  commitBubble,
  asBubbleCommitError
} from "./commitCommandApi.js";
import type { CommitBubbleResult } from "./commitCommandContract.js";

export interface BubbleCommitCommandOptions {
  id: string;
  refs: string[];
  repo?: string;
  message?: string;
  stageAll: boolean;
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
    '  pairflow bubble commit --id <id> [--repo <path>] [--message "<text>"] [--ref <artifact-path>]... [--stage-all]',
    "",
    "Options:",
    "  --id <id>             Bubble id",
    "  --repo <path>         Optional repository path (defaults to cwd ancestry lookup)",
    "  --message <text>      Optional git commit message override",
    "  --ref <path>          Optional artifact reference (repeatable)",
    "  --stage-all           Stage all worktree changes before validating staged files",
    "  -h, --help            Show this help",
    "",
    "Notes:",
    "  Requires state APPROVED_FOR_COMMIT.",
    "  Without --stage-all, commit expects staged files to already exist."
  ].join("\n");
}

export function parseBubbleCommitCommandOptions(
  args: string[]
): ParsedBubbleCommitCommandOptions {
  if (
    args.some((arg) =>
      arg === "--auto" ||
      arg === "--no-auto" ||
      arg.startsWith("--auto=")
    )
  ) {
    throw new Error(
      "COMMIT_AUTO_REMOVED: Removed option --auto. Use --stage-all to stage all worktree changes before commit. context: command_name=commit."
    );
  }

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
      "stage-all": {
        type: "boolean"
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
    throw new Error(
      "COMMIT_ID_REQUIRED: Missing required option: --id. context: command_name=commit."
    );
  }

  return {
    id,
    refs,
    ...(parsed.values.repo !== undefined ? { repo: parsed.values.repo } : {}),
    ...(parsed.values.message !== undefined ? { message: parsed.values.message } : {}),
    stageAll: parsed.values["stage-all"] ?? false,
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
      stageAll: options.stageAll,
      cwd
    }, commitBubbleDependencyDefaults);
  } catch (error) {
    asBubbleCommitError(error);
  }
}
