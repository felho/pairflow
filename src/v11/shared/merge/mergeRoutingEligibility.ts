import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { GitRunResult } from "../../../core/workspace/git.js";

export interface MergeBranchValidationInput {
  baseBranch: string;
  bubbleBranch: string;
  baseBranchExists: boolean;
  bubbleBranchExists: boolean;
  createError: (message: string) => Error;
}

const MERGE_STATE_DONE_REQUIRED = "MERGE_STATE_DONE_REQUIRED";
const MERGE_BASE_BRANCH_NOT_FOUND = "MERGE_BASE_BRANCH_NOT_FOUND";
const MERGE_BUBBLE_BRANCH_NOT_FOUND = "MERGE_BUBBLE_BRANCH_NOT_FOUND";
const MERGE_BRANCHES_IDENTICAL = "MERGE_BRANCHES_IDENTICAL";
const MERGE_REPO_DIRTY = "MERGE_REPO_DIRTY";
const MERGE_ORIGIN_REMOTE_REQUIRED = "MERGE_ORIGIN_REMOTE_REQUIRED";

export type GitRunner = (
  args: string[],
  options: { cwd: string; allowFailure?: boolean }
) => Promise<GitRunResult>;

export function hasOriginRemoteError(stderr: string): boolean {
  const normalized = stderr.toLowerCase();
  return (
    normalized.includes("no such remote") ||
    normalized.includes("not appear to be a git repository")
  );
}

export function assertMergeStateEligibility(
  state: BubbleStateSnapshot,
  createError: (message: string) => Error
): void {
  if (state.state !== "DONE") {
    throw createError(
      `${MERGE_STATE_DONE_REQUIRED}: bubble merge requires state DONE (current: ${state.state}); context: command_name=merge.`
    );
  }
}

export function assertMergeBranchEligibility(
  input: MergeBranchValidationInput
): void {
  if (!input.baseBranchExists) {
    throw input.createError(
      `${MERGE_BASE_BRANCH_NOT_FOUND}: Base branch not found locally: ${input.baseBranch}`
    );
  }
  if (!input.bubbleBranchExists) {
    throw input.createError(
      `${MERGE_BUBBLE_BRANCH_NOT_FOUND}: Bubble branch not found locally: ${input.bubbleBranch}`
    );
  }
  if (input.baseBranch === input.bubbleBranch) {
    throw input.createError(
      `${MERGE_BRANCHES_IDENTICAL}: Base branch and bubble branch cannot be identical.`
    );
  }
}

export async function assertCleanRepoWorkingTree(
  repoPath: string,
  runGitCommand: GitRunner,
  createError: (message: string) => Error
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
    throw createError(
      `${MERGE_REPO_DIRTY}: Repository has uncommitted changes at ${repoPath}. Commit/stash them before bubble merge.`
    );
  }
}

export async function ensureOriginRemote(
  repoPath: string,
  runGitCommand: GitRunner,
  createError: (message: string) => Error
): Promise<void> {
  const origin = await runGitCommand(["remote", "get-url", "origin"], {
    cwd: repoPath,
    allowFailure: true
  });
  if (origin.exitCode !== 0) {
    throw createError(
      `${MERGE_ORIGIN_REMOTE_REQUIRED}: Remote origin is required for push/delete-remote operations at ${repoPath}.`
    );
  }
}

export async function remoteBranchExists(input: {
  repoPath: string;
  branch: string;
  runGitCommand: GitRunner;
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
