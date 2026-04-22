import { parseArgs } from "node:util";

import {
  asBubbleMergeErrorV11 as throwAsBubbleMergeError,
  mergeBubbleV11 as mergeBubble,
  type MergeBubbleV11Result as MergeBubbleResult
} from "../../../v11/application/merge/emitMergeV11.js";

export interface BubbleMergeCommandOptions {
  id: string;
  repo?: string;
  push: boolean;
  "delete-remote": boolean;
  json: boolean;
  help: false;
}

export interface BubbleMergeHelpCommandOptions {
  help: true;
}

export type ParsedBubbleMergeCommandOptions =
  | BubbleMergeCommandOptions
  | BubbleMergeHelpCommandOptions;

export function getBubbleMergeHelpText(): string {
  return [
    "Usage:",
    "  pairflow bubble merge --id <id> [--repo <path>] [--push] [--delete-remote] [--json]",
    "",
    "Options:",
    "  --id <id>             Bubble id",
    "  --repo <path>         Optional repository path (defaults to cwd ancestry lookup)",
    "  --push                Local-route only: push merged base branch to origin",
    "  --delete-remote       Local-route only: delete remote bubble branch from origin after merge",
    "  --json                Print structured JSON output",
    "  -h, --help            Show this help",
    "",
    "Notes:",
    "  Requires bubble state DONE and clean repository working tree.",
    "  Local route: merges the bubble branch into the local base branch; --push/--delete-remote remain available.",
    "  Started-remote route: imports the remote merge handoff, completes the durable merge in the local repo, and rejects --push/--delete-remote.",
    "  Merge cleanup then removes runtime/session/worktree artifacts for the completed route."
  ].join("\n");
}

function renderBubbleMergeCleanupText(result: MergeBubbleResult): string {
  return [
    `tmuxExisted=${result.tmuxSessionExisted ? "yes" : "no"}`,
    `runtimeSessionRemoved=${result.runtimeSessionRemoved ? "yes" : "no"}`,
    `worktreeRemoved=${result.removedWorktree ? "yes" : "no"}`,
    `branchRemoved=${result.removedBubbleBranch ? "yes" : "no"}`
  ].join(", ");
}

export function renderBubbleMergeResultText(
  result: MergeBubbleResult
): string {
  const prefix =
    `Merged bubble ${result.bubbleId}: `
    + `${result.bubbleBranch} -> ${result.baseBranch} @ ${result.mergeCommitSha}; `;

  switch (result.presentationRoute) {
    case "started_remote":
      return (
        prefix
        + "durableMerge=localRepoFromStartedRemoteHandoff, "
        + renderBubbleMergeCleanupText(result)
      );
    case "local":
      return (
        prefix
        + `pushed=${result.pushedBaseBranch ? "yes" : "no"}, `
        + `remoteDeleted=${result.deletedRemoteBranch ? "yes" : "no"}, `
        + renderBubbleMergeCleanupText(result)
      );
  }

  const unexpectedRoute: never = result.presentationRoute;
  throw new Error(`Unsupported bubble merge presentation route: ${unexpectedRoute}`);
}

export function parseBubbleMergeCommandOptions(
  args: string[]
): ParsedBubbleMergeCommandOptions {
  const parsed = parseArgs({
    args,
    options: {
      id: {
        type: "string"
      },
      repo: {
        type: "string"
      },
      push: {
        type: "boolean"
      },
      "delete-remote": {
        type: "boolean"
      },
      json: {
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
    push: parsed.values.push ?? false,
    "delete-remote": parsed.values["delete-remote"] ?? false,
    json: parsed.values.json ?? false,
    help: false
  };
}

export async function executeBubbleMergeCommand(
  options: BubbleMergeCommandOptions,
  cwd: string = process.cwd()
): Promise<MergeBubbleResult> {
  try {
    return await mergeBubble({
      bubbleId: options.id,
      repoPath: options.repo,
      cwd,
      push: options.push,
      deleteRemote: options["delete-remote"]
    });
  } catch (error) {
    return throwAsBubbleMergeError(error);
  }
}

export async function runBubbleMergeCommand(
  args: string[],
  cwd: string = process.cwd()
): Promise<MergeBubbleResult | null> {
  const options = parseBubbleMergeCommandOptions(args);
  if (options.help) {
    return null;
  }

  return executeBubbleMergeCommand(options, cwd);
}
