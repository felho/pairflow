import { join } from "node:path";

import type {
  ExtractCommandDiagnostics,
  ExtractCommandInput,
  ExtractCommandResult,
  ExtractSelectedPath,
  ExtractTransferInput
} from "./extractCommandContract.js";
import { commitSelectedPaths } from "./extractCommit.js";
import type { GitRunResult } from "../../shared/ports/git.js";

const ABSENT_FILE_ERROR_CODES = new Set(["ENOENT", "ENOTDIR"]);
const DIRECTORY_ALREADY_EXISTS_ERROR_CODES = new Set(["EEXIST"]);
const TARGET_ALREADY_EXISTS_ERROR_CODES = new Set(["EEXIST"]);

function baseResult(input: {
  command: ExtractCommandInput;
  bubbleId: string;
  targetRepoPath: string;
}): {
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

function buildFailure(input: {
  command: ExtractCommandInput;
  bubbleId: string;
  targetRepoPath: string;
  reasonCode: ExtractCommandResult extends infer Result
    ? Result extends { status: "failed"; reasonCode: infer Reason }
      ? Reason
      : never
    : never;
  diagnostics: ExtractCommandDiagnostics;
}): ExtractCommandResult {
  return {
    ...baseResult(input),
    status: "failed",
    reasonCode: input.reasonCode,
    diagnostics: input.diagnostics
  };
}

function findDuplicateSelectedPath(
  selectedPaths: ExtractSelectedPath[]
): { normalizedPath: string; rawPaths: string[] } | null {
  const rawPathsByNormalizedPath = new Map<string, string[]>();
  for (const selectedPath of selectedPaths) {
    rawPathsByNormalizedPath.set(selectedPath.normalizedPath, [
      ...(rawPathsByNormalizedPath.get(selectedPath.normalizedPath) ?? []),
      selectedPath.rawPath
    ]);
  }

  for (const [normalizedPath, rawPaths] of rawPathsByNormalizedPath) {
    if (rawPaths.length > 1) {
      return { normalizedPath, rawPaths };
    }
  }

  return null;
}

function parseNulDelimitedGitPathList(stdout: string): string[] {
  return stdout
    .split("\0")
    .filter((path) => path.length > 0)
    .sort();
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

function samePathSet(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((path, index) => path === right[index]);
}

async function readStagedPathList(input: ExtractTransferInput): Promise<
  | { status: "read"; stagedPaths: string[] }
  | { status: "failed"; result: GitRunResult }
  | { status: "rejected"; message: string }
> {
  const stagedRun = await runExtractGit({
    transfer: input,
    args: ["diff", "--cached", "--name-only", "-z"]
  });
  if (stagedRun.status === "rejected") {
    return stagedRun;
  }
  if (stagedRun.result.exitCode !== 0) {
    return { status: "failed", result: stagedRun.result };
  }
  return {
    status: "read",
    stagedPaths: parseNulDelimitedGitPathList(stagedRun.result.stdout)
  };
}

function isConfirmedAbsent(info: {
  exists: boolean;
  errorCode?: string;
}): boolean {
  return (
    !info.exists
    && (info.errorCode === undefined || ABSENT_FILE_ERROR_CODES.has(info.errorCode))
  );
}

function getErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

function stringifyError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function createAndVerifyTargetParentDirectories(input: {
  transfer: ExtractTransferInput;
  selectedPath: ExtractSelectedPath;
  copiedPaths: string[];
}): Promise<ExtractCommandResult | null> {
  const parentSegments = input.selectedPath.normalizedPath.split("/").slice(0, -1);
  for (let index = 1; index <= parentSegments.length; index += 1) {
    const targetParentPath = join(
      input.transfer.targetRepoPath,
      parentSegments.slice(0, index).join("/")
    );
    const beforeCreate = await input.transfer.dependencies.fileInfo(targetParentPath);
    if (beforeCreate.exists && beforeCreate.isDirectory === true) {
      continue;
    }
    if (!isConfirmedAbsent(beforeCreate)) {
      return buildCopyFailure({
        ...input,
        targetParentPath,
        step: "create_parent_directory",
        message: "target parent path is not a directory"
      });
    }

    let createError: unknown;
    try {
      await input.transfer.dependencies.createDirectory(targetParentPath);
    } catch (error) {
      createError = error;
      if (!DIRECTORY_ALREADY_EXISTS_ERROR_CODES.has(getErrorCode(error) ?? "")) {
        return buildCopyFailure({
          ...input,
          targetParentPath,
          step: "create_parent_directory",
          message: stringifyError(error)
        });
      }
    }

    const afterCreate = await input.transfer.dependencies.fileInfo(targetParentPath);
    if (!afterCreate.exists || afterCreate.isDirectory !== true) {
      return buildCopyFailure({
        ...input,
        targetParentPath,
        step: "create_parent_directory",
        message:
          createError === undefined
            ? "target parent directory verification failed"
            : stringifyError(createError)
      });
    }
  }

  return null;
}

function buildCopyFailure(input: {
  transfer: ExtractTransferInput;
  selectedPath: ExtractSelectedPath;
  copiedPaths: string[];
  targetParentPath?: string;
  step: "create_parent_directory" | "copy_file";
  message: string;
}): ExtractCommandResult {
  return buildFailure({
    ...input.transfer,
    reasonCode: "EXTRACT_COPY_FAILED",
    diagnostics: {
      resolvedBubbleRepoPath: input.transfer.resolvedBubbleRepoPath,
      targetRepoPath: input.transfer.targetRepoPath,
      path: input.selectedPath.rawPath,
      normalizedPath: input.selectedPath.normalizedPath,
      sourcePath: input.selectedPath.sourcePath,
      targetPath: input.targetParentPath ?? input.selectedPath.targetPath,
      copiedPaths: input.copiedPaths,
      filesystemStep: input.step,
      stderr: input.message
    }
  });
}

function buildTargetExistsFailure(input: {
  transfer: ExtractTransferInput;
  selectedPath: ExtractSelectedPath;
  copiedPaths: string[];
  message: string;
}): ExtractCommandResult {
  return buildFailure({
    ...input.transfer,
    reasonCode: "EXTRACT_TARGET_PATH_EXISTS",
    diagnostics: {
      resolvedBubbleRepoPath: input.transfer.resolvedBubbleRepoPath,
      targetRepoPath: input.transfer.targetRepoPath,
      path: input.selectedPath.rawPath,
      normalizedPath: input.selectedPath.normalizedPath,
      sourcePath: input.selectedPath.sourcePath,
      targetPath: input.selectedPath.targetPath,
      copiedPaths: input.copiedPaths,
      filesystemStep: "copy_file",
      stderr: input.message,
      successorContract: "no_overwrite_target_conflict_check"
    }
  });
}

async function copySelectedPaths(
  input: ExtractTransferInput
): Promise<{ status: "copied"; copiedPaths: string[] } | ExtractCommandResult> {
  const copiedPaths: string[] = [];
  for (const selectedPath of input.selectedPaths) {
    const parentFailure = await createAndVerifyTargetParentDirectories({
      transfer: input,
      selectedPath,
      copiedPaths
    });
    if (parentFailure !== null) {
      return parentFailure;
    }

    try {
      await input.dependencies.copyFile(selectedPath.sourcePath, selectedPath.targetPath);
      copiedPaths.push(selectedPath.normalizedPath);
    } catch (error) {
      if (TARGET_ALREADY_EXISTS_ERROR_CODES.has(getErrorCode(error) ?? "")) {
        return buildTargetExistsFailure({
          transfer: input,
          selectedPath,
          copiedPaths,
          message: stringifyError(error)
        });
      }
      return buildCopyFailure({
        transfer: input,
        selectedPath,
        copiedPaths,
        step: "copy_file",
        message: stringifyError(error)
      });
    }
  }

  return { status: "copied", copiedPaths };
}

async function stageSelectedPaths(input: ExtractTransferInput & {
  copiedPaths: string[];
  selectedNormalizedPaths: string[];
}): Promise<{ status: "staged"; stagedPaths: string[] } | ExtractCommandResult> {
  const selectedNormalizedPaths = input.selectedNormalizedPaths;
  const stageRun = await runExtractGit({
    transfer: input,
    args: ["add", "-f", "--", ...selectedNormalizedPaths]
  });
  if (stageRun.status === "rejected") {
    return buildFailure({
      ...input,
      reasonCode: "EXTRACT_STAGE_FAILED",
      diagnostics: {
        resolvedBubbleRepoPath: input.resolvedBubbleRepoPath,
        targetRepoPath: input.targetRepoPath,
        copiedPaths: input.copiedPaths,
        expectedStagedPaths: selectedNormalizedPaths,
        gitStep: "stage",
        stderr: stageRun.message
      }
    });
  }

  const stage = stageRun.result;
  if (stage.exitCode !== 0) {
    const stagedRead = await readStagedPathList(input);
    return buildFailure({
      ...input,
      reasonCode: "EXTRACT_STAGE_FAILED",
      diagnostics: {
        resolvedBubbleRepoPath: input.resolvedBubbleRepoPath,
        targetRepoPath: input.targetRepoPath,
        copiedPaths: input.copiedPaths,
        ...(stagedRead.status === "read" ? { stagedPaths: stagedRead.stagedPaths } : {}),
        expectedStagedPaths: selectedNormalizedPaths,
        gitStep: "stage",
        exitCode: stage.exitCode,
        stdout: stage.stdout.trim(),
        stderr: stage.stderr.trim()
      }
    });
  }

  const stagedRead = await readStagedPathList(input);
  if (stagedRead.status === "rejected") {
    return buildFailure({
      ...input,
      reasonCode: "EXTRACT_STAGE_FAILED",
      diagnostics: {
        resolvedBubbleRepoPath: input.resolvedBubbleRepoPath,
        targetRepoPath: input.targetRepoPath,
        copiedPaths: input.copiedPaths,
        stagedPaths: selectedNormalizedPaths,
        expectedStagedPaths: selectedNormalizedPaths,
        gitStep: "read_staged_paths",
        stderr: stagedRead.message
      }
    });
  }

  if (stagedRead.status === "failed") {
    const staged = stagedRead.result;
    return buildFailure({
      ...input,
      reasonCode: "EXTRACT_STAGE_FAILED",
      diagnostics: {
        resolvedBubbleRepoPath: input.resolvedBubbleRepoPath,
        targetRepoPath: input.targetRepoPath,
        copiedPaths: input.copiedPaths,
        stagedPaths: selectedNormalizedPaths,
        expectedStagedPaths: selectedNormalizedPaths,
        gitStep: "read_staged_paths",
        exitCode: staged.exitCode,
        stdout: staged.stdout.trim(),
        stderr: staged.stderr.trim()
      }
    });
  }

  const stagedPaths = stagedRead.stagedPaths;
  if (!samePathSet(stagedPaths, [...selectedNormalizedPaths].sort())) {
    return buildFailure({
      ...input,
      reasonCode: "EXTRACT_STAGED_SCOPE_MISMATCH",
      diagnostics: {
        resolvedBubbleRepoPath: input.resolvedBubbleRepoPath,
        targetRepoPath: input.targetRepoPath,
        copiedPaths: input.copiedPaths,
        stagedPaths,
        expectedStagedPaths: selectedNormalizedPaths
      }
    });
  }

  return { status: "staged", stagedPaths: selectedNormalizedPaths };
}

export async function transferExtractSelectedPaths(
  input: ExtractTransferInput
): Promise<ExtractCommandResult> {
  const duplicate = findDuplicateSelectedPath(input.selectedPaths);
  if (duplicate !== null) {
    return buildFailure({
      ...input,
      reasonCode: "EXTRACT_DUPLICATE_SELECTED_PATH",
      diagnostics: {
        resolvedBubbleRepoPath: input.resolvedBubbleRepoPath,
        targetRepoPath: input.targetRepoPath,
        normalizedPath: duplicate.normalizedPath,
        duplicatePaths: [duplicate.normalizedPath],
        duplicateRawPaths: duplicate.rawPaths
      }
    });
  }

  const copyResult = await copySelectedPaths(input);
  if (copyResult.status !== "copied") {
    return copyResult;
  }

  if (!input.command.commit) {
    return {
      ...baseResult(input),
      status: "success",
      selectedPaths: input.selectedPaths,
      copiedPaths: copyResult.copiedPaths
    };
  }

  const selectedNormalizedPaths = input.selectedPaths.map(
    (selectedPath) => selectedPath.normalizedPath
  );
  const stageResult = await stageSelectedPaths({
    ...input,
    copiedPaths: copyResult.copiedPaths,
    selectedNormalizedPaths
  });
  if (stageResult.status !== "staged") {
    return stageResult;
  }

  return commitSelectedPaths({
    ...input,
    copiedPaths: copyResult.copiedPaths,
    stagedPaths: stageResult.stagedPaths
  });
}
