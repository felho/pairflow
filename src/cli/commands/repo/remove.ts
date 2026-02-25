import { resolve } from "node:path";
import { parseArgs } from "node:util";

import { normalizeRepoPath } from "../../../core/bubble/repoResolution.js";
import {
  removeRepoFromRegistry,
  type RemoveRepoResult
} from "../../../core/repo/registry.js";

export interface RepoRemoveCommandOptions {
  repoPath: string;
  help: false;
}

export interface RepoRemoveHelpCommandOptions {
  help: true;
}

export type ParsedRepoRemoveCommandOptions =
  | RepoRemoveCommandOptions
  | RepoRemoveHelpCommandOptions;

export interface RepoRemoveCommandResult {
  removed: boolean;
  repoPath: string;
  registryPath: string;
}

export function getRepoRemoveHelpText(): string {
  return [
    "Usage:",
    "  pairflow repo remove <path>",
    "",
    "Options:",
    "  -h, --help            Show this help"
  ].join("\n");
}

export function parseRepoRemoveCommandOptions(
  args: string[]
): ParsedRepoRemoveCommandOptions {
  const parsed = parseArgs({
    args,
    options: {
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

  return {
    repoPath,
    help: false
  };
}

function toCommandResult(
  removeResult: RemoveRepoResult,
  canonicalRepoPath: string
): RepoRemoveCommandResult {
  return {
    removed: removeResult.removed,
    repoPath: canonicalRepoPath,
    registryPath: removeResult.registryPath
  };
}

export async function runRepoRemoveCommand(
  args: string[],
  cwd: string = process.cwd()
): Promise<RepoRemoveCommandResult | null> {
  const options = parseRepoRemoveCommandOptions(args);
  if (options.help) {
    return null;
  }

  const resolvedRepoPath = resolve(cwd, options.repoPath);
  const removed = await removeRepoFromRegistry({
    repoPath: resolvedRepoPath
  });
  const canonicalRepoPath =
    removed.removedEntry?.repoPath ??
    (await normalizeRepoPath(resolvedRepoPath));
  return toCommandResult(removed, canonicalRepoPath);
}
