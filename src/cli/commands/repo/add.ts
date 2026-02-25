import { resolve } from "node:path";
import { parseArgs } from "node:util";

import {
  registerRepoInRegistry,
  type RegisterRepoResult
} from "../../../core/repo/registry.js";
import { assertGitRepository, GitRepositoryError } from "../../../core/workspace/git.js";

export interface RepoAddCommandOptions {
  repoPath: string;
  label?: string | undefined;
  help: false;
}

export interface RepoAddHelpCommandOptions {
  help: true;
}

export type ParsedRepoAddCommandOptions =
  | RepoAddCommandOptions
  | RepoAddHelpCommandOptions;

export function getRepoAddHelpText(): string {
  return [
    "Usage:",
    "  pairflow repo add <path> [--label <text>]",
    "",
    "Options:",
    "  --label <text>       Optional label stored in repo registry metadata",
    "  -h, --help            Show this help"
  ].join("\n");
}

export function parseRepoAddCommandOptions(
  args: string[]
): ParsedRepoAddCommandOptions {
  const parsed = parseArgs({
    args,
    options: {
      label: {
        type: "string"
      },
      help: {
        type: "boolean",
        short: "h"
      }
    },
    strict: true,
    allowPositionals: true
  });

  if (parsed.values.help ?? false) {
    return {
      help: true
    };
  }

  if (parsed.positionals.length === 0) {
    throw new Error("Missing required positional argument: <path>");
  }
  if (parsed.positionals.length > 1) {
    throw new Error("Unexpected extra positional arguments.");
  }

  const repoPath = parsed.positionals[0];
  if (repoPath === undefined || repoPath.trim().length === 0) {
    throw new Error("Repository path cannot be empty.");
  }

  const label = parsed.values.label;
  if (label !== undefined && label.trim().length === 0) {
    throw new Error("Repository label cannot be empty.");
  }

  return {
    repoPath,
    ...(label !== undefined ? { label } : {}),
    help: false
  };
}

async function assertRepoPath(path: string): Promise<void> {
  try {
    await assertGitRepository(path);
  } catch (error) {
    if (error instanceof GitRepositoryError) {
      throw new Error(`Repository path is not a git repository: ${path}`);
    }
    throw error;
  }
}

export async function runRepoAddCommand(
  args: string[],
  cwd: string = process.cwd()
): Promise<RegisterRepoResult | null> {
  const options = parseRepoAddCommandOptions(args);
  if (options.help) {
    return null;
  }

  const repoPath = resolve(cwd, options.repoPath);
  // Validate the user-provided path first; registry persistence normalizes to
  // canonical realpath semantics so symlink aliases still dedupe consistently.
  await assertRepoPath(repoPath);
  return registerRepoInRegistry({
    repoPath,
    ...(options.label !== undefined ? { label: options.label } : {})
  });
}
