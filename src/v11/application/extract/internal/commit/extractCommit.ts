import type {
  ExtractCommandDiagnostics,
  ExtractCommandResult,
  ExtractTransferInput
} from "../../extractCommandContract.js";
import type { GitRunResult } from "../../../../ports/git.js";
import { classifyCommitMessage } from "../../../../shared/commitPolicy/commitMessagePolicy.js";

const DEFAULT_EXTRACT_COMMIT_MESSAGE = "docs(extract): copy selected ideation artifacts";

interface CommitSelectedPathsInput extends ExtractTransferInput {
  copiedPaths: string[];
  stagedPaths: string[];
}

type ExtractFailureReason = ExtractCommandResult extends infer Result
  ? Result extends { status: "failed"; reasonCode: infer Reason }
    ? Reason
    : never
  : never;

type ExtractGitStep = NonNullable<ExtractCommandDiagnostics["gitStep"]>;

function baseResult(input: CommitSelectedPathsInput): {
  bubbleId: string;
  repoPath: string;
  paths: string[];
  commitRequested: boolean;
  message?: string;
} {
  return {
    bubbleId: input.bubbleId,
    repoPath: input.targetRepoPath,
    paths: input.command.paths,
    commitRequested: input.command.commit,
    ...(input.command.message !== undefined ? { message: input.command.message } : {})
  };
}

function buildFailure(input: CommitSelectedPathsInput & {
  reasonCode: ExtractFailureReason;
  diagnostics: ExtractCommandDiagnostics;
}): ExtractCommandResult {
  return {
    ...baseResult(input),
    status: "failed",
    reasonCode: input.reasonCode,
    diagnostics: input.diagnostics
  };
}

function buildCommitFailure(input: CommitSelectedPathsInput & {
  gitStep: ExtractGitStep;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  commitSha?: string;
  expectedStagedPaths?: string[];
}): ExtractCommandResult {
  return buildFailure({
    ...input,
    reasonCode: "EXTRACT_COMMIT_FAILED",
    diagnostics: {
      resolvedBubbleRepoPath: input.resolvedBubbleRepoPath,
      targetRepoPath: input.targetRepoPath,
      copiedPaths: input.copiedPaths,
      stagedPaths: input.stagedPaths,
      gitStep: input.gitStep,
      ...(input.expectedStagedPaths !== undefined
        ? { expectedStagedPaths: input.expectedStagedPaths }
        : {}),
      ...(input.exitCode !== undefined ? { exitCode: input.exitCode } : {}),
      ...(input.stdout !== undefined ? { stdout: input.stdout } : {}),
      ...(input.stderr !== undefined ? { stderr: input.stderr } : {}),
      ...(input.commitSha !== undefined ? { commitSha: input.commitSha } : {})
    }
  });
}

function parseNulDelimitedGitPathList(stdout: string): string[] {
  return stdout
    .split("\0")
    .filter((path) => path.length > 0)
    .sort();
}

function samePathSet(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((path, index) => path === right[index]);
}

function resolveExtractCommitMessage(
  input: CommitSelectedPathsInput
): string | ExtractCommandResult {
  const commitMessage = input.command.message ?? DEFAULT_EXTRACT_COMMIT_MESSAGE;
  const policy = classifyCommitMessage(commitMessage);
  if (policy.status === "accepted") {
    return commitMessage;
  }

  return buildFailure({
    ...input,
    reasonCode: "EXTRACT_COMMIT_MESSAGE_POLICY_REJECTED",
    diagnostics: {
      resolvedBubbleRepoPath: input.resolvedBubbleRepoPath,
      targetRepoPath: input.targetRepoPath,
      copiedPaths: input.copiedPaths,
      stagedPaths: input.stagedPaths,
      stderr: policy.message
    }
  });
}

async function runExtractGit(input: {
  transfer: ExtractTransferInput;
  args: string[];
}): Promise<
  | { status: "completed"; result: GitRunResult }
  | { status: "rejected"; message: string }
> {
  try {
    const result = await input.transfer.dependencies.runGit(input.args, {
      cwd: input.transfer.targetRepoPath,
      allowFailure: true
    });
    return { status: "completed", result };
  } catch (error) {
    return {
      status: "rejected",
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

async function writeCommitTree(
  input: CommitSelectedPathsInput
): Promise<{ status: "tree"; treeSha: string } | ExtractCommandResult> {
  const run = await runExtractGit({ transfer: input, args: ["write-tree"] });
  if (run.status === "rejected") {
    return buildCommitFailure({
      ...input,
      gitStep: "write_commit_tree",
      stderr: run.message
    });
  }
  const treeSha = run.result.stdout.trim();
  if (run.result.exitCode !== 0 || treeSha.length === 0) {
    return buildCommitFailure({
      ...input,
      gitStep: "write_commit_tree",
      exitCode: run.result.exitCode,
      stdout: run.result.stdout.trim(),
      stderr: run.result.stderr.trim()
    });
  }
  return { status: "tree", treeSha };
}

async function resolveBaseHead(
  input: CommitSelectedPathsInput
): Promise<{ status: "base"; baseHeadSha: string } | ExtractCommandResult> {
  const run = await runExtractGit({ transfer: input, args: ["rev-parse", "HEAD"] });
  if (run.status === "rejected") {
    return buildCommitFailure({
      ...input,
      gitStep: "resolve_base_head",
      stderr: run.message
    });
  }
  const baseHeadSha = run.result.stdout.trim();
  if (run.result.exitCode !== 0 || baseHeadSha.length === 0) {
    return buildCommitFailure({
      ...input,
      gitStep: "resolve_base_head",
      exitCode: run.result.exitCode,
      stdout: run.result.stdout.trim(),
      stderr: run.result.stderr.trim()
    });
  }
  return { status: "base", baseHeadSha };
}

async function verifyCommitTreeScope(
  input: CommitSelectedPathsInput & { baseHeadSha: string; treeSha: string }
): Promise<{ status: "verified" } | ExtractCommandResult> {
  const run = await runExtractGit({
    transfer: input,
    args: ["diff-tree", "--name-only", "-z", "-r", input.baseHeadSha, input.treeSha]
  });
  if (run.status === "rejected") {
    return buildCommitFailure({
      ...input,
      gitStep: "verify_commit_tree_scope",
      expectedStagedPaths: input.stagedPaths,
      stderr: run.message
    });
  }
  if (run.result.exitCode !== 0) {
    return buildCommitFailure({
      ...input,
      gitStep: "verify_commit_tree_scope",
      expectedStagedPaths: input.stagedPaths,
      exitCode: run.result.exitCode,
      stdout: run.result.stdout.trim(),
      stderr: run.result.stderr.trim()
    });
  }

  const treeChangedPaths = parseNulDelimitedGitPathList(run.result.stdout);
  if (!samePathSet(treeChangedPaths, [...input.stagedPaths].sort())) {
    return buildFailure({
      ...input,
      reasonCode: "EXTRACT_STAGED_SCOPE_MISMATCH",
      diagnostics: {
        resolvedBubbleRepoPath: input.resolvedBubbleRepoPath,
        targetRepoPath: input.targetRepoPath,
        copiedPaths: input.copiedPaths,
        stagedPaths: treeChangedPaths,
        expectedStagedPaths: input.stagedPaths,
        gitStep: "verify_commit_tree_scope"
      }
    });
  }

  return { status: "verified" };
}

async function createCommitObject(input: CommitSelectedPathsInput & {
  baseHeadSha: string;
  treeSha: string;
  commitMessage: string;
}): Promise<{ status: "created"; commitSha: string } | ExtractCommandResult> {
  const run = await runExtractGit({
    transfer: input,
    args: [
      "commit-tree",
      input.treeSha,
      "-p",
      input.baseHeadSha,
      "-m",
      input.commitMessage
    ]
  });
  if (run.status === "rejected") {
    return buildCommitFailure({
      ...input,
      gitStep: "create_commit",
      stderr: run.message
    });
  }
  const commitSha = run.result.stdout.trim();
  if (run.result.exitCode !== 0 || commitSha.length === 0) {
    return buildCommitFailure({
      ...input,
      gitStep: "create_commit",
      exitCode: run.result.exitCode,
      stdout: run.result.stdout.trim(),
      stderr: run.result.stderr.trim()
    });
  }
  return { status: "created", commitSha };
}

async function updateHeadToCommit(input: CommitSelectedPathsInput & {
  baseHeadSha: string;
  commitMessage: string;
  commitSha: string;
}): Promise<{ status: "updated" } | ExtractCommandResult> {
  const run = await runExtractGit({
    transfer: input,
    args: [
      "update-ref",
      "-m",
      input.commitMessage,
      "HEAD",
      input.commitSha,
      input.baseHeadSha
    ]
  });
  if (run.status === "rejected") {
    return buildCommitFailure({
      ...input,
      gitStep: "update_head",
      commitSha: input.commitSha,
      stderr: run.message
    });
  }
  if (run.result.exitCode !== 0) {
    return buildCommitFailure({
      ...input,
      gitStep: "update_head",
      commitSha: input.commitSha,
      exitCode: run.result.exitCode,
      stdout: run.result.stdout.trim(),
      stderr: run.result.stderr.trim()
    });
  }
  return { status: "updated" };
}

async function verifyResolvedCommitSha(
  input: CommitSelectedPathsInput & { expectedCommitSha: string }
): Promise<{ status: "resolved"; commitSha: string } | ExtractCommandResult> {
  const run = await runExtractGit({ transfer: input, args: ["rev-parse", "HEAD"] });
  if (run.status === "rejected") {
    return buildCommitFailure({
      ...input,
      gitStep: "resolve_commit_sha",
      commitSha: input.expectedCommitSha,
      stderr: run.message
    });
  }
  const commitSha = run.result.stdout.trim();
  if (run.result.exitCode !== 0 || commitSha.length === 0) {
    return buildCommitFailure({
      ...input,
      gitStep: "resolve_commit_sha",
      commitSha: input.expectedCommitSha,
      exitCode: run.result.exitCode,
      stdout: run.result.stdout.trim(),
      stderr: run.result.stderr.trim()
    });
  }
  if (commitSha !== input.expectedCommitSha) {
    return buildCommitFailure({
      ...input,
      gitStep: "resolve_commit_sha",
      commitSha: input.expectedCommitSha,
      stdout: commitSha,
      stderr: "resolved HEAD does not match created extract commit"
    });
  }
  return { status: "resolved", commitSha: input.expectedCommitSha };
}

export async function commitSelectedPaths(
  input: CommitSelectedPathsInput
): Promise<ExtractCommandResult> {
  const commitMessage = resolveExtractCommitMessage(input);
  if (typeof commitMessage !== "string") {
    return commitMessage;
  }
  const base = await resolveBaseHead(input);
  if (base.status !== "base") {
    return base;
  }
  const tree = await writeCommitTree(input);
  if (tree.status !== "tree") {
    return tree;
  }
  const verified = await verifyCommitTreeScope({
    ...input,
    baseHeadSha: base.baseHeadSha,
    treeSha: tree.treeSha
  });
  if (verified.status !== "verified") {
    return verified;
  }
  const created = await createCommitObject({
    ...input,
    baseHeadSha: base.baseHeadSha,
    treeSha: tree.treeSha,
    commitMessage
  });
  if (created.status !== "created") {
    return created;
  }
  const updated = await updateHeadToCommit({
    ...input,
    baseHeadSha: base.baseHeadSha,
    commitMessage,
    commitSha: created.commitSha
  });
  if (updated.status !== "updated") {
    return updated;
  }
  const resolved = await verifyResolvedCommitSha({
    ...input,
    expectedCommitSha: created.commitSha
  });
  if (resolved.status !== "resolved") {
    return resolved;
  }

  return {
    ...baseResult(input),
    status: "success",
    selectedPaths: input.selectedPaths,
    copiedPaths: input.copiedPaths,
    stagedPaths: input.stagedPaths,
    commitSha: resolved.commitSha,
    commitMessage
  };
}
