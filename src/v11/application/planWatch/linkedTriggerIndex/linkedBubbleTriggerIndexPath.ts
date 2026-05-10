import { isAbsolute, relative, resolve } from "node:path";

export function resolveRepoTaskPath(repoPath: string, taskPath: string): string | undefined {
  const resolvedRepoPath = resolve(repoPath);
  const resolvedTaskPath = isAbsolute(taskPath)
    ? resolve(taskPath)
    : resolve(resolvedRepoPath, taskPath);
  const relativeTaskPath = relative(resolvedRepoPath, resolvedTaskPath);

  return relativeTaskPath.length === 0
    || (!relativeTaskPath.startsWith("..") && !isAbsolute(relativeTaskPath))
    ? resolvedTaskPath
    : undefined;
}
