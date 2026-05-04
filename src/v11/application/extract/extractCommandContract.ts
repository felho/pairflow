import type { RunGitPort } from "../../shared/ports/git.js";
import type { ResolveBubbleByIdPort } from "../../shared/ports/bubbleLookup.js";
import type { ResolveRepoPathPort } from "../../shared/ports/repoResolution.js";

export type ExtractCommandFailureReasonCode =
  | "EXTRACT_BUBBLE_NOT_FOUND"
  | "EXTRACT_TARGET_REPO_UNRESOLVED"
  | "EXTRACT_IDEATION_REQUIRED"
  | "EXTRACT_IDEATION_METADATA_INVALID"
  | "EXTRACT_REPO_MISMATCH"
  | "EXTRACT_TARGET_CHECKOUT_INVALID"
  | "EXTRACT_TRANSFER_NOT_IMPLEMENTED";

export type ExtractTargetCheckoutFailureReason =
  | "not_git_repository"
  | "detached_head"
  | "non_main_branch"
  | "dirty_worktree"
  | "merge_in_progress"
  | "rebase_in_progress"
  | "cherry_pick_in_progress";

export interface ExtractCommandOptions {
  id: string;
  paths: string[];
  repo?: string;
  commit: boolean;
  message?: string;
  json: boolean;
}

export interface ExtractCommandInput extends ExtractCommandOptions {
  cwd?: string;
}

export interface ExtractCommandDiagnostics {
  requestedRepoPath?: string;
  resolvedBubbleRepoPath?: string;
  targetRepoPath?: string;
  ideationParseWarning?: string;
  checkoutFailureReason?: ExtractTargetCheckoutFailureReason;
  checkoutDetails?: string;
  duplicatePaths?: string[];
  successorContract?: "no_overwrite_target_conflict_check";
}

export interface ExtractCommandResultBase {
  bubbleId: string;
  repoPath: string | null;
  paths: string[];
  commitRequested: boolean;
  message?: string;
  diagnostics?: ExtractCommandDiagnostics;
}

export interface ExtractCommandFailedResult extends ExtractCommandResultBase {
  status: "failed";
  reasonCode: Exclude<
    ExtractCommandFailureReasonCode,
    "EXTRACT_TRANSFER_NOT_IMPLEMENTED"
  >;
}

export interface ExtractCommandImplementationDeferredResult
  extends ExtractCommandResultBase {
  status: "implementation_deferred";
  reasonCode: "EXTRACT_TRANSFER_NOT_IMPLEMENTED";
}

export type ExtractCommandResult =
  | ExtractCommandFailedResult
  | ExtractCommandImplementationDeferredResult;

export interface ExtractCommandDependencies {
  resolveBubbleById: ResolveBubbleByIdPort;
  resolveRepoPath: ResolveRepoPathPort;
  runGit: RunGitPort;
  fileExists: (path: string) => Promise<boolean>;
}
