import { join, posix } from "node:path";

import type { ResolvedBubbleById } from "../../shared/ports/bubbleLookup.js";
import type {
  ExtractCommandDependencies,
  ExtractCommandDiagnostics,
  ExtractCommandFailureReasonCode,
  ExtractCommandInput,
  ExtractCommandResult,
  ExtractSelectedPath
} from "./extractCommandContract.js";

const ALLOWED_PATH_PREFIXES = ["plans/", "docs/", "progress/"] as const;
const GLOB_PATTERN = /[*?[\]{}]/u;
const ABSENT_FILE_ERROR_CODES = new Set(["ENOENT", "ENOTDIR"]);

function buildPathFailure(input: {
  command: ExtractCommandInput;
  repoPath: string;
  reasonCode: Exclude<
    ExtractCommandFailureReasonCode,
    "EXTRACT_TRANSFER_NOT_IMPLEMENTED"
  >;
  diagnostics: ExtractCommandDiagnostics;
}): ExtractCommandResult {
  return {
    bubbleId: input.command.id,
    repoPath: input.repoPath,
    paths: input.command.paths,
    commitRequested: input.command.commit,
    ...(input.command.message !== undefined ? { message: input.command.message } : {}),
    status: "failed",
    reasonCode: input.reasonCode,
    diagnostics: input.diagnostics
  };
}

function isUnsafePath(path: string): boolean {
  if (path.trim().length === 0) {
    return true;
  }
  if (path.includes("\\") || path.includes("\0") || posix.isAbsolute(path)) {
    return true;
  }

  const segments = path.split("/");
  return segments.includes("") || segments.includes(".") || segments.includes("..");
}

function normalizeSelectedPath(rawPath: string):
  | { ok: true; normalizedPath: string }
  | {
      ok: false;
      reasonCode:
        | "EXTRACT_PATH_UNSAFE"
        | "EXTRACT_PATH_GLOB_UNSUPPORTED"
        | "EXTRACT_PATH_SCOPE_FORBIDDEN";
      normalizedPath?: string;
    } {
  if (isUnsafePath(rawPath)) {
    return { ok: false, reasonCode: "EXTRACT_PATH_UNSAFE" };
  }
  if (GLOB_PATTERN.test(rawPath)) {
    return { ok: false, reasonCode: "EXTRACT_PATH_GLOB_UNSUPPORTED" };
  }

  const normalizedPath = posix.normalize(rawPath);
  if (
    normalizedPath === "."
    || normalizedPath === ".."
    || normalizedPath.startsWith("../")
    || posix.isAbsolute(normalizedPath)
  ) {
    return { ok: false, reasonCode: "EXTRACT_PATH_UNSAFE", normalizedPath };
  }

  if (!ALLOWED_PATH_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix))) {
    return {
      ok: false,
      reasonCode: "EXTRACT_PATH_SCOPE_FORBIDDEN",
      normalizedPath
    };
  }

  return { ok: true, normalizedPath };
}

function isConfirmedAbsent(info: { exists: boolean; errorCode?: string }): boolean {
  return (
    !info.exists
    && (info.errorCode === undefined || ABSENT_FILE_ERROR_CODES.has(info.errorCode))
  );
}

export async function validateExtractPathSelection(input: {
  command: ExtractCommandInput;
  resolvedBubble: ResolvedBubbleById;
  targetRepoPath: string;
  dependencies: Pick<ExtractCommandDependencies, "fileInfo" | "runGit">;
}): Promise<
  | { status: "path_selection_passed"; selectedPaths: ExtractSelectedPath[] }
  | ExtractCommandResult
> {
  const selectedPaths: ExtractSelectedPath[] = [];

  for (const rawPath of input.command.paths) {
    const selectedPath = await validateSingleSelectedPath({
      ...input,
      rawPath
    });
    if ("status" in selectedPath) {
      return selectedPath;
    }
    selectedPaths.push(selectedPath);
  }

  return {
    status: "path_selection_passed",
    selectedPaths
  };
}

async function validateSingleSelectedPath(input: {
  command: ExtractCommandInput;
  resolvedBubble: ResolvedBubbleById;
  targetRepoPath: string;
  dependencies: Pick<ExtractCommandDependencies, "fileInfo" | "runGit">;
  rawPath: string;
}): Promise<ExtractSelectedPath | ExtractCommandResult> {
  const normalized = normalizeSelectedPath(input.rawPath);
  if (!normalized.ok) {
    return buildPathFailure({
      command: input.command,
      repoPath: input.targetRepoPath,
      reasonCode: normalized.reasonCode,
      diagnostics: basePathDiagnostics(input, normalized.normalizedPath)
    });
  }

  const sourcePath = join(
    input.resolvedBubble.bubblePaths.worktreePath,
    normalized.normalizedPath
  );
  const targetPath = join(input.targetRepoPath, normalized.normalizedPath);
  const sourceFailure = await validateSourcePath({
    ...input,
    normalizedPath: normalized.normalizedPath,
    sourcePath,
    targetPath
  });
  if (sourceFailure !== null) {
    return sourceFailure;
  }

  const targetFailure = await validateTargetPath({
    ...input,
    normalizedPath: normalized.normalizedPath,
    sourcePath,
    targetPath
  });
  if (targetFailure !== null) {
    return targetFailure;
  }

  return {
    rawPath: input.rawPath,
    normalizedPath: normalized.normalizedPath,
    sourcePath,
    targetPath
  };
}

function basePathDiagnostics(
  input: {
    resolvedBubble: ResolvedBubbleById;
    targetRepoPath: string;
    rawPath: string;
  },
  normalizedPath?: string
): ExtractCommandDiagnostics {
  return {
    resolvedBubbleRepoPath: input.resolvedBubble.repoPath,
    targetRepoPath: input.targetRepoPath,
    path: input.rawPath,
    ...(normalizedPath !== undefined ? { normalizedPath } : {})
  };
}

async function validateSourcePath(input: {
  command: ExtractCommandInput;
  resolvedBubble: ResolvedBubbleById;
  targetRepoPath: string;
  dependencies: Pick<ExtractCommandDependencies, "fileInfo">;
  rawPath: string;
  normalizedPath: string;
  sourcePath: string;
  targetPath: string;
}): Promise<ExtractCommandResult | null> {
  const parentFailure = await findSourceParentFailure({
    worktreePath: input.resolvedBubble.bubblePaths.worktreePath,
    normalizedPath: input.normalizedPath,
    dependencies: input.dependencies
  });
  if (parentFailure !== null) {
    return buildPathFailure({
      command: input.command,
      repoPath: input.targetRepoPath,
      reasonCode: parentFailure.reasonCode,
      diagnostics: pathDiagnostics(input, parentFailure.sourcePath)
    });
  }

  const sourceInfo = await input.dependencies.fileInfo(input.sourcePath);
  if (!sourceInfo.exists || !isConfirmedSourceReadable(sourceInfo)) {
    return buildPathFailure({
      command: input.command,
      repoPath: input.targetRepoPath,
      reasonCode: "EXTRACT_SOURCE_PATH_MISSING",
      diagnostics: pathDiagnostics(input, input.sourcePath)
    });
  }
  if (!sourceInfo.isFile) {
    return buildPathFailure({
      command: input.command,
      repoPath: input.targetRepoPath,
      reasonCode: "EXTRACT_SOURCE_PATH_NOT_FILE",
      diagnostics: pathDiagnostics(input, input.sourcePath)
    });
  }

  return null;
}

async function validateTargetPath(input: {
  command: ExtractCommandInput;
  resolvedBubble: ResolvedBubbleById;
  targetRepoPath: string;
  dependencies: Pick<ExtractCommandDependencies, "fileInfo" | "runGit">;
  rawPath: string;
  normalizedPath: string;
  sourcePath: string;
  targetPath: string;
}): Promise<ExtractCommandResult | null> {
  const targetInfo = await input.dependencies.fileInfo(input.targetPath);
  if (targetInfo.exists || !isConfirmedAbsent(targetInfo)) {
    return buildTargetPathFailure(input, input.targetPath);
  }

  const trackedTargetFailure = await validateTargetPathIsNotTracked(input);
  if (trackedTargetFailure !== null) {
    return trackedTargetFailure;
  }

  const trackedParentCollision = await findTrackedTargetParentCollision(input);
  if (trackedParentCollision !== null) {
    return buildTargetPathFailure(input, trackedParentCollision);
  }

  const parentCollision = await findTargetParentCollision({
    targetRepoPath: input.targetRepoPath,
    normalizedPath: input.normalizedPath,
    dependencies: input.dependencies
  });
  return parentCollision === null
    ? null
    : buildTargetPathFailure(input, parentCollision);
}

async function validateTargetPathIsNotTracked(input: {
  command: ExtractCommandInput;
  resolvedBubble: ResolvedBubbleById;
  targetRepoPath: string;
  dependencies: Pick<ExtractCommandDependencies, "runGit">;
  rawPath: string;
  normalizedPath: string;
  sourcePath: string;
  targetPath: string;
}): Promise<ExtractCommandResult | null> {
  try {
    const result = await input.dependencies.runGit(
      ["cat-file", "-e", `HEAD:${input.normalizedPath}`],
      { cwd: input.targetRepoPath, allowFailure: true }
    );
    if (result.exitCode === 0) {
      return buildTargetPathFailure(input, input.targetPath);
    }
    return null;
  } catch {
    return buildTargetPathFailure(input, input.targetPath);
  }
}

async function findTrackedTargetParentCollision(input: {
  targetRepoPath: string;
  normalizedPath: string;
  dependencies: Pick<ExtractCommandDependencies, "runGit">;
}): Promise<string | null> {
  const parentSegments = input.normalizedPath.split("/").slice(0, -1);

  for (let index = 1; index <= parentSegments.length; index += 1) {
    const normalizedParentPath = parentSegments.slice(0, index).join("/");
    try {
      const result = await input.dependencies.runGit(
        ["cat-file", "-t", `HEAD:${normalizedParentPath}`],
        { cwd: input.targetRepoPath, allowFailure: true }
      );
      if (result.exitCode === 0 && result.stdout.trim() !== "tree") {
        return join(input.targetRepoPath, normalizedParentPath);
      }
    } catch {
      return join(input.targetRepoPath, normalizedParentPath);
    }
  }

  return null;
}

function isConfirmedSourceReadable(info: {
  exists: boolean;
  errorCode?: string;
}): boolean {
  return info.exists && info.errorCode === undefined;
}

function pathDiagnostics(
  input: {
    resolvedBubble: ResolvedBubbleById;
    targetRepoPath: string;
    rawPath: string;
    normalizedPath: string;
    sourcePath: string;
    targetPath: string;
  },
  sourcePath: string
): ExtractCommandDiagnostics {
  return {
    ...basePathDiagnostics(input, input.normalizedPath),
    sourcePath,
    targetPath: input.targetPath
  };
}

function buildTargetPathFailure(
  input: {
    command: ExtractCommandInput;
    resolvedBubble: ResolvedBubbleById;
    targetRepoPath: string;
    rawPath: string;
    normalizedPath: string;
    sourcePath: string;
    targetPath: string;
  },
  targetPath: string
): ExtractCommandResult {
  return buildPathFailure({
    command: input.command,
    repoPath: input.targetRepoPath,
    reasonCode: "EXTRACT_TARGET_PATH_EXISTS",
    diagnostics: {
      ...basePathDiagnostics(input, input.normalizedPath),
      sourcePath: input.sourcePath,
      targetPath
    }
  });
}

async function findTargetParentCollision(input: {
  targetRepoPath: string;
  normalizedPath: string;
  dependencies: Pick<ExtractCommandDependencies, "fileInfo">;
}): Promise<string | null> {
  const segments = input.normalizedPath.split("/");
  const parentSegments = segments.slice(0, -1);

  for (let index = 1; index <= parentSegments.length; index += 1) {
    const parentPath = join(
      input.targetRepoPath,
      parentSegments.slice(0, index).join("/")
    );
    const parentInfo = await input.dependencies.fileInfo(parentPath);
    if (
      (parentInfo.exists && parentInfo.isDirectory !== true)
      || (!parentInfo.exists && !isConfirmedAbsent(parentInfo))
    ) {
      return parentPath;
    }
  }

  return null;
}

async function findSourceParentFailure(input: {
  worktreePath: string;
  normalizedPath: string;
  dependencies: Pick<ExtractCommandDependencies, "fileInfo">;
}): Promise<
  | {
      reasonCode: "EXTRACT_SOURCE_PATH_MISSING" | "EXTRACT_SOURCE_PATH_NOT_FILE";
      sourcePath: string;
    }
  | null
> {
  const segments = input.normalizedPath.split("/");
  const parentSegments = segments.slice(0, -1);

  for (let index = 1; index <= parentSegments.length; index += 1) {
    const parentPath = join(
      input.worktreePath,
      parentSegments.slice(0, index).join("/")
    );
    const parentInfo = await input.dependencies.fileInfo(parentPath);
    if (parentInfo.exists && parentInfo.isDirectory !== true) {
      return {
        reasonCode: "EXTRACT_SOURCE_PATH_NOT_FILE",
        sourcePath: parentPath
      };
    }
    if (!parentInfo.exists && !isConfirmedAbsent(parentInfo)) {
      return {
        reasonCode: "EXTRACT_SOURCE_PATH_MISSING",
        sourcePath: parentPath
      };
    }
  }

  return null;
}
