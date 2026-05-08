import type { RunGitPort } from "../../ports/git.js";
import type { ResolveBubbleByIdPort } from "../../ports/bubbleLookup.js";
import type { ResolveRepoPathPort } from "../../ports/repoResolution.js";

export type ExtractCommandFailureReasonCode =
  | "EXTRACT_BUBBLE_NOT_FOUND"
  | "EXTRACT_TARGET_REPO_UNRESOLVED"
  | "EXTRACT_IDEATION_REQUIRED"
  | "EXTRACT_IDEATION_METADATA_INVALID"
  | "EXTRACT_REPO_MISMATCH"
  | "EXTRACT_TARGET_CHECKOUT_INVALID"
  | "EXTRACT_PATH_UNSAFE"
  | "EXTRACT_PATH_GLOB_UNSUPPORTED"
  | "EXTRACT_PATH_SCOPE_FORBIDDEN"
  | "EXTRACT_SOURCE_PATH_MISSING"
  | "EXTRACT_SOURCE_PATH_NOT_FILE"
  | "EXTRACT_TARGET_PATH_EXISTS"
  | "EXTRACT_DUPLICATE_SELECTED_PATH"
  | "EXTRACT_COPY_FAILED"
  | "EXTRACT_STAGE_FAILED"
  | "EXTRACT_STAGED_SCOPE_MISMATCH"
  | "EXTRACT_COMMIT_FAILED"
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
  path?: string;
  normalizedPath?: string;
  sourcePath?: string;
  targetPath?: string;
  copiedPaths?: string[];
  stagedPaths?: string[];
  expectedStagedPaths?: string[];
  commitSha?: string;
  duplicateRawPaths?: string[];
  gitStep?:
    | "stage"
    | "read_staged_paths"
    | "resolve_base_head"
    | "write_commit_tree"
    | "verify_commit_tree_scope"
    | "create_commit"
    | "update_head"
    | "resolve_commit_sha";
  filesystemStep?: "create_parent_directory" | "copy_file";
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  successorContract?: "no_overwrite_target_conflict_check";
}

export interface ExtractSelectedPath {
  rawPath: string;
  normalizedPath: string;
  sourcePath: string;
  targetPath: string;
}

export interface ExtractFileInfo {
  exists: boolean;
  isFile: boolean;
  isDirectory?: boolean;
  errorCode?: string;
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

export interface ExtractCommandSuccessResult
  extends ExtractCommandResultBase {
  status: "success";
  selectedPaths: ExtractSelectedPath[];
  copiedPaths: string[];
  stagedPaths?: string[];
  commitSha?: string;
  commitMessage?: string;
}

export type ExtractCommandResult =
  | ExtractCommandFailedResult
  | ExtractCommandSuccessResult;

export interface ExtractCommandDependencies {
  resolveBubbleById: ResolveBubbleByIdPort;
  resolveRepoPath: ResolveRepoPathPort;
  runGit: RunGitPort;
  fileExists: (path: string) => Promise<boolean>;
  fileInfo: (path: string) => Promise<ExtractFileInfo>;
  createDirectory: (path: string) => Promise<void>;
  copyFile: (sourcePath: string, targetPath: string) => Promise<void>;
}

export interface ExtractTransferInput {
  command: ExtractCommandInput;
  bubbleId: string;
  targetRepoPath: string;
  resolvedBubbleRepoPath: string;
  selectedPaths: ExtractSelectedPath[];
  dependencies: Pick<
    ExtractCommandDependencies,
    "copyFile" | "createDirectory" | "fileInfo" | "runGit"
  >;
}
