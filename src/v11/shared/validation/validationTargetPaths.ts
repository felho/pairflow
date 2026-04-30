import { realpathSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

function normalizeRelativePath(input: string): string | undefined {
  const normalized = input.trim();
  if (
    normalized.length === 0 ||
    normalized.includes("\\") ||
    normalized.startsWith("/") ||
    normalized.includes("//")
  ) {
    return undefined;
  }
  const segments = normalized.split("/");
  if (
    segments.some(
      (segment) => segment.length === 0 || segment === "." || segment === ".."
    )
  ) {
    return undefined;
  }
  return segments.join("/");
}

function containsGlobPattern(input: string): boolean {
  return /[*?[{\]}]/u.test(input);
}

export function normalizeValidationTargetCwd(input: string): string | undefined {
  const normalized = normalizeRelativePath(input);
  if (normalized === undefined || containsGlobPattern(normalized)) {
    return undefined;
  }
  return normalized;
}

export function normalizeValidationTargetPathSelector(
  input: string
): string | undefined {
  return normalizeRelativePath(input);
}

function assertPathInsideWorktree(input: {
  worktreePath: string;
  candidatePath: string;
}): void {
  const relativePath = relative(input.worktreePath, input.candidatePath);
  if (
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`)
  ) {
    throw new Error(
      `VALIDATION_TARGET_CWD_OUTSIDE_WORKTREE: validation target cwd resolves outside the worktree. context: worktree_path=${input.worktreePath} candidate_path=${input.candidatePath}.`
    );
  }
}

function toValidationTargetCwdOutsideWorktreeError(cause?: unknown): Error {
  return new Error(
    `VALIDATION_TARGET_CWD_OUTSIDE_WORKTREE: validation target cwd resolves outside the worktree. context: cwd_containment=failed.`,
    cause === undefined ? undefined : { cause }
  );
}

function realpathNativeInsideWorktree(path: string): string {
  try {
    return realpathSync.native(path);
  } catch (error) {
    throw toValidationTargetCwdOutsideWorktreeError(error);
  }
}

function resolveExistingPathPrefix(input: {
  worktreePath: string;
  candidatePath: string;
  allowMissingWorktreePath?: boolean;
}): string {
  let current = input.candidatePath;
  while (current !== dirname(current)) {
    try {
      return join(
        realpathSync.native(current),
        relative(current, input.candidatePath)
      );
    } catch (error) {
      const typedError = error as NodeJS.ErrnoException;
      if (typedError.code !== "ENOENT" && typedError.code !== "ENOTDIR") {
        throw toValidationTargetCwdOutsideWorktreeError(error);
      }
      if (current === input.worktreePath && input.allowMissingWorktreePath !== true) {
        throw toValidationTargetCwdOutsideWorktreeError(error);
      }
      current = dirname(current);
    }
  }
  throw toValidationTargetCwdOutsideWorktreeError();
}

export function resolveValidationTargetCwd(input: {
  worktreePath: string;
  cwd: string;
  allowMissingWorktreePath?: boolean;
}): string {
  const normalizedCwd = normalizeValidationTargetCwd(input.cwd);
  if (normalizedCwd === undefined) {
    throw new Error(
      `VALIDATION_TARGET_CWD_INVALID: validation target cwd must be a non-empty normalized relative path. context: cwd=${input.cwd}.`
    );
  }

  const worktreePath = resolve(input.worktreePath);
  const cwdPath = resolve(worktreePath, normalizedCwd);
  assertPathInsideWorktree({ worktreePath, candidatePath: cwdPath });

  const realWorktreePath =
    input.allowMissingWorktreePath === true
      ? resolveExistingPathPrefix({
          worktreePath,
          candidatePath: worktreePath,
          allowMissingWorktreePath: true
        })
      : realpathNativeInsideWorktree(worktreePath);
  const realCwdPath = resolveExistingPathPrefix({
    worktreePath,
    candidatePath: cwdPath,
    ...(input.allowMissingWorktreePath === true
      ? { allowMissingWorktreePath: true }
      : {})
  });
  assertPathInsideWorktree({
    worktreePath: realWorktreePath,
    candidatePath: realCwdPath
  });
  return realCwdPath;
}
