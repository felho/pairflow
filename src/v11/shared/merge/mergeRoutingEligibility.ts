import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { RunGitPort } from "../ports/git.js";

const MERGE_STATE_DONE_REQUIRED = "MERGE_STATE_DONE_REQUIRED";
const MERGE_BASE_BRANCH_NOT_FOUND = "MERGE_BASE_BRANCH_NOT_FOUND";
const MERGE_BUBBLE_BRANCH_NOT_FOUND = "MERGE_BUBBLE_BRANCH_NOT_FOUND";
const MERGE_BRANCHES_IDENTICAL = "MERGE_BRANCHES_IDENTICAL";
const MERGE_REPO_DIRTY = "MERGE_REPO_DIRTY";
const MERGE_ORIGIN_REMOTE_REQUIRED = "MERGE_ORIGIN_REMOTE_REQUIRED";

export interface MergeBranchValidationInput {
  baseBranch: string;
  bubbleBranch: string;
  baseBranchExists: boolean;
  bubbleBranchExists: boolean;
  createError: PairflowCreateCommandError;
}

export function hasOriginRemoteError(stderr: string): boolean {
  const normalized = stderr.toLowerCase();
  return (
    normalized.includes("no such remote") ||
    normalized.includes("not appear to be a git repository")
  );
}

export function assertMergeStateEligibility(
  state: BubbleStateSnapshot,
  createError: PairflowCreateCommandError
): void {
  if (state.state !== "DONE") {
    throw createError({
      reasonCode: MERGE_STATE_DONE_REQUIRED,
      message: `bubble merge requires state DONE (current: ${state.state}).`,
      context: {
        command_name: "merge",
        current_state: state.state
      }
    });
  }
}

export function assertMergeBranchEligibility(
  input: MergeBranchValidationInput
): void {
  if (!input.baseBranchExists) {
    throw input.createError({
      reasonCode: MERGE_BASE_BRANCH_NOT_FOUND,
      message: `Base branch not found locally: ${input.baseBranch}`,
      context: {
        command_name: "merge",
        base_branch: input.baseBranch
      }
    });
  }
  if (!input.bubbleBranchExists) {
    throw input.createError({
      reasonCode: MERGE_BUBBLE_BRANCH_NOT_FOUND,
      message: `Bubble branch not found locally: ${input.bubbleBranch}`,
      context: {
        command_name: "merge",
        bubble_branch: input.bubbleBranch
      }
    });
  }
  if (input.baseBranch === input.bubbleBranch) {
    throw input.createError({
      reasonCode: MERGE_BRANCHES_IDENTICAL,
      message: "Base branch and bubble branch cannot be identical.",
      context: {
        command_name: "merge",
        base_branch: input.baseBranch,
        bubble_branch: input.bubbleBranch
      }
    });
  }
}

export async function assertCleanRepoWorkingTree(
  repoPath: string,
  runGitCommand: RunGitPort,
  createError: PairflowCreateCommandError
): Promise<void> {
  const status = await runGitCommand(["status", "--porcelain"], {
    cwd: repoPath
  });
  const blockingLines = status.stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter(
      (line) =>
        !line.endsWith(" .pairflow") &&
        !line.includes(" .pairflow/") &&
        !line.startsWith("?? .pairflow") &&
        !line.startsWith("?? .pairflow/")
    );
  if (blockingLines.length > 0) {
    throw createError({
      reasonCode: MERGE_REPO_DIRTY,
      message: `Repository has uncommitted changes at ${repoPath}. Commit/stash them before bubble merge.`,
      context: {
        command_name: "merge",
        repo_path: repoPath,
        blocking_line_count: blockingLines.length
      }
    });
  }
}

export async function ensureOriginRemote(
  repoPath: string,
  runGitCommand: RunGitPort,
  createError: PairflowCreateCommandError
): Promise<void> {
  const origin = await runGitCommand(["remote", "get-url", "origin"], {
    cwd: repoPath,
    allowFailure: true
  });
  if (origin.exitCode !== 0) {
    throw createError({
      reasonCode: MERGE_ORIGIN_REMOTE_REQUIRED,
      message: `Remote origin is required for push/delete-remote operations at ${repoPath}.`,
      context: {
        command_name: "merge",
        repo_path: repoPath
      }
    });
  }
}

export async function remoteBranchExists(input: {
  repoPath: string;
  branch: string;
  runGitCommand: RunGitPort;
}): Promise<boolean> {
  const result = await input.runGitCommand(
    ["ls-remote", "--heads", "origin", input.branch],
    {
      cwd: input.repoPath,
      allowFailure: true
    }
  );
  return result.exitCode === 0 && result.stdout.trim().length > 0;
}
