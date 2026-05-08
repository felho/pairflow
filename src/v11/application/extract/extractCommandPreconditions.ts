import { join } from "node:path";

import {
  hasIdeationMetadataParseWarning,
  resolveIdeationMetadata
} from "../../domain/ideation/ideationMetadata.js";
import type { ResolvedBubbleById } from "../../ports/bubbleLookup.js";
import type {
  ExtractCommandDependencies,
  ExtractCommandDiagnostics,
  ExtractCommandFailureReasonCode,
  ExtractCommandInput,
  ExtractCommandResult,
  ExtractTargetCheckoutFailureReason
} from "./extractCommandContract.js";

interface TargetCheckoutPreconditionPassed {
  ok: true;
}

interface TargetCheckoutPreconditionFailed {
  ok: false;
  reason: ExtractTargetCheckoutFailureReason;
  details?: string;
}

export type TargetCheckoutPreconditionResult =
  | TargetCheckoutPreconditionPassed
  | TargetCheckoutPreconditionFailed;

function buildFailure(input: {
  command: ExtractCommandInput;
  repoPath: string | null;
  reasonCode: Exclude<
    ExtractCommandFailureReasonCode,
    "EXTRACT_TRANSFER_NOT_IMPLEMENTED"
  >;
  diagnostics?: ExtractCommandDiagnostics;
}): ExtractCommandResult {
  return {
    bubbleId: input.command.id,
    repoPath: input.repoPath,
    paths: input.command.paths,
    commitRequested: input.command.commit,
    ...(input.command.message !== undefined ? { message: input.command.message } : {}),
    status: "failed",
    reasonCode: input.reasonCode,
    ...(input.diagnostics !== undefined ? { diagnostics: input.diagnostics } : {})
  };
}

async function gitHeadPathExists(input: {
  repoPath: string;
  gitPath: string;
  dependencies: Pick<ExtractCommandDependencies, "fileExists" | "runGit">;
}): Promise<boolean> {
  const resolvedPath = await input.dependencies.runGit(
    ["rev-parse", "--git-path", input.gitPath],
    {
      cwd: input.repoPath,
      allowFailure: true
    }
  );
  if (resolvedPath.exitCode !== 0) {
    return false;
  }

  const rawPath = resolvedPath.stdout.trim();
  if (rawPath.length === 0) {
    return false;
  }

  return input.dependencies.fileExists(
    rawPath.startsWith("/") ? rawPath : join(input.repoPath, rawPath)
  );
}

export async function checkTargetCheckoutPreconditions(
  repoPath: string,
  dependencies: Pick<ExtractCommandDependencies, "fileExists" | "runGit">
): Promise<TargetCheckoutPreconditionResult> {
  const insideWorktree = await dependencies.runGit(
    ["rev-parse", "--is-inside-work-tree"],
    {
      cwd: repoPath,
      allowFailure: true
    }
  );
  if (insideWorktree.exitCode !== 0 || insideWorktree.stdout.trim() !== "true") {
    return { ok: false, reason: "not_git_repository" };
  }

  const branch = await dependencies.runGit(["rev-parse", "--abbrev-ref", "HEAD"], {
    cwd: repoPath,
    allowFailure: true
  });
  const branchName = branch.stdout.trim();
  if (branch.exitCode !== 0 || branchName === "HEAD") {
    return { ok: false, reason: "detached_head" };
  }
  if (branchName !== "main") {
    return {
      ok: false,
      reason: "non_main_branch",
      details: branchName
    };
  }

  const status = await dependencies.runGit(["status", "--porcelain"], {
    cwd: repoPath,
    allowFailure: true
  });
  if (status.exitCode !== 0) {
    return {
      ok: false,
      reason: "not_git_repository",
      details: status.stderr.trim()
    };
  }
  if (status.stdout.trim().length > 0) {
    return {
      ok: false,
      reason: "dirty_worktree",
      details: status.stdout.trim()
    };
  }

  if (
    await gitHeadPathExists({
      repoPath,
      gitPath: "MERGE_HEAD",
      dependencies
    })
  ) {
    return { ok: false, reason: "merge_in_progress" };
  }

  if (
    await gitHeadPathExists({
      repoPath,
      gitPath: "rebase-merge",
      dependencies
    })
    || await gitHeadPathExists({
      repoPath,
      gitPath: "rebase-apply",
      dependencies
    })
  ) {
    return { ok: false, reason: "rebase_in_progress" };
  }

  if (
    await gitHeadPathExists({
      repoPath,
      gitPath: "CHERRY_PICK_HEAD",
      dependencies
    })
  ) {
    return { ok: false, reason: "cherry_pick_in_progress" };
  }

  return { ok: true };
}

export function assertIdeationEligible(input: {
  command: ExtractCommandInput;
  resolvedBubble: ResolvedBubbleById;
}): ExtractCommandResult | null {
  if (hasIdeationMetadataParseWarning(input.resolvedBubble.bubbleConfig)) {
    const ideationParseWarning =
      resolveIdeationMetadata(input.resolvedBubble.bubbleConfig).parseWarning;
    return buildFailure({
      command: input.command,
      repoPath: input.resolvedBubble.repoPath,
      reasonCode: "EXTRACT_IDEATION_METADATA_INVALID",
      diagnostics: {
        resolvedBubbleRepoPath: input.resolvedBubble.repoPath,
        ...(ideationParseWarning !== undefined ? { ideationParseWarning } : {})
      }
    });
  }

  const ideation = resolveIdeationMetadata(input.resolvedBubble.bubbleConfig);
  if (!ideation.mode) {
    return buildFailure({
      command: input.command,
      repoPath: input.resolvedBubble.repoPath,
      reasonCode: "EXTRACT_IDEATION_REQUIRED",
      diagnostics: {
        resolvedBubbleRepoPath: input.resolvedBubble.repoPath
      }
    });
  }

  return null;
}

export async function validateExtractCommandPreconditions(input: {
  command: ExtractCommandInput;
  dependencies: ExtractCommandDependencies;
}): Promise<
  | ExtractCommandResult
  | {
      status: "preconditions_passed";
      resolvedBubble: ResolvedBubbleById;
      targetRepoPath: string;
    }
> {
  let resolvedBubble: ResolvedBubbleById;
  try {
    resolvedBubble = await input.dependencies.resolveBubbleById({
      bubbleId: input.command.id,
      ...(input.command.repo !== undefined
        ? { repoPath: input.command.repo }
        : input.command.cwd !== undefined
          ? { cwd: input.command.cwd }
          : {})
    });
  } catch (error) {
    return buildFailure({
      command: input.command,
      repoPath: null,
      reasonCode: "EXTRACT_BUBBLE_NOT_FOUND",
      diagnostics: {
        ...(input.command.repo !== undefined
          ? { requestedRepoPath: input.command.repo }
          : {}),
        checkoutDetails: error instanceof Error ? error.message : String(error)
      }
    });
  }

  const ideationFailure = assertIdeationEligible({
    command: input.command,
    resolvedBubble
  });
  if (ideationFailure !== null) {
    return ideationFailure;
  }

  let targetRepoPath: string;
  try {
    targetRepoPath = await input.dependencies.resolveRepoPath({
      ...(input.command.repo !== undefined
        ? { repoPath: input.command.repo }
        : input.command.cwd !== undefined
          ? { cwd: input.command.cwd }
          : {})
    });
  } catch (error) {
    return buildFailure({
      command: input.command,
      repoPath: resolvedBubble.repoPath,
      reasonCode: "EXTRACT_TARGET_REPO_UNRESOLVED",
      diagnostics: {
        ...(input.command.repo !== undefined
          ? { requestedRepoPath: input.command.repo }
          : {}),
        resolvedBubbleRepoPath: resolvedBubble.repoPath,
        checkoutDetails: error instanceof Error ? error.message : String(error)
      }
    });
  }

  const resolvedBubbleRepoPath = await input.dependencies.resolveRepoPath({
    repoPath: resolvedBubble.repoPath
  }).catch(() => resolvedBubble.repoPath);

  if (targetRepoPath !== resolvedBubbleRepoPath) {
    return buildFailure({
      command: input.command,
      repoPath: targetRepoPath,
      reasonCode: "EXTRACT_REPO_MISMATCH",
      diagnostics: {
        ...(input.command.repo !== undefined
          ? { requestedRepoPath: input.command.repo }
          : {}),
        resolvedBubbleRepoPath,
        targetRepoPath
      }
    });
  }

  const checkout = await checkTargetCheckoutPreconditions(
    targetRepoPath,
    input.dependencies
  );
  if (!checkout.ok) {
    return buildFailure({
      command: input.command,
      repoPath: targetRepoPath,
      reasonCode: "EXTRACT_TARGET_CHECKOUT_INVALID",
      diagnostics: {
        resolvedBubbleRepoPath,
        targetRepoPath,
        checkoutFailureReason: checkout.reason,
        ...(checkout.details !== undefined ? { checkoutDetails: checkout.details } : {})
      }
    });
  }

  return {
    status: "preconditions_passed",
    resolvedBubble: {
      ...resolvedBubble,
      repoPath: resolvedBubbleRepoPath
    },
    targetRepoPath
  };
}
