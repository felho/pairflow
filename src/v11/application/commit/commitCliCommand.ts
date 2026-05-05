import { parseArgs } from "node:util";

import {
  commitBubble,
  asBubbleCommitError
} from "./commitCommandApi.js";
import type { CommitBubbleResult } from "./commitCommandContract.js";
import type { CommitBubbleDependencies } from "./commitCommandApiContract.js";

type CommitCommandDefaultsModule = {
  commitBubbleDependencyDefaults: CommitBubbleDependencies;
};

let commitCommandDefaultsModulePromise:
  | Promise<CommitCommandDefaultsModule>
  | undefined;

function getCommitCommandDefaultsModulePath(): string {
  return [
    "..",
    "..",
    "defaults",
    "commit",
    "commitCommandDefaults.js"
  ].join("/");
}

async function loadCommitBubbleDependencyDefaults(): Promise<
  CommitBubbleDependencies
> {
  commitCommandDefaultsModulePromise ??= import(
    getCommitCommandDefaultsModulePath()
  ) as Promise<CommitCommandDefaultsModule>;
  const module = await commitCommandDefaultsModulePromise;
  return module.commitBubbleDependencyDefaults;
}

export interface BubbleCommitCommandOptions {
  id: string;
  refs: string[];
  repo?: string;
  message?: string;
  stageAll: boolean;
  force: boolean;
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
    '  pairflow bubble commit --id <id> [--repo <path>] [--message "<text>"] [--ref <artifact-path>]... [--stage-all] [--force]',
    "",
    "Options:",
    "  --id <id>             Bubble id",
    "  --repo <path>         Optional repository path (defaults to cwd ancestry lookup)",
    "  --message <text>      Optional git commit message override",
    "  --ref <path>          Optional artifact reference (repeatable)",
    "  --stage-all           Stage all worktree changes before validating staged files",
    "  --force               Allow an empty finalize commit when no files are staged",
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
      force: {
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
    force: parsed.values.force ?? false,
    help: false
  };
}

export async function runBubbleCommitCommand(
  args: string[],
  cwd: string = process.cwd(),
  dependencies?: CommitBubbleDependencies
): Promise<CommitBubbleResult | null> {
  const options = parseBubbleCommitCommandOptions(args);
  if (options.help) {
    return null;
  }

  try {
    const resolvedDependencies =
      dependencies ?? await loadCommitBubbleDependencyDefaults();
    return await commitBubble({
      bubbleId: options.id,
      refs: options.refs,
      repoPath: options.repo,
      message: options.message,
      stageAll: options.stageAll,
      force: options.force,
      cwd
    }, resolvedDependencies);
  } catch (error) {
    asBubbleCommitError(error);
  }
}
