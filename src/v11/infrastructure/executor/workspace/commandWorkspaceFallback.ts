import { resolve } from "node:path";

export const pairflowWorktreeRootEnvVar = "PAIRFLOW_WORKTREE_ROOT";

export function resolvePairflowWorktreeRootFromEnv(
  envValue: string | undefined = process.env[pairflowWorktreeRootEnvVar]
): string | undefined {
  if (typeof envValue !== "string") {
    return undefined;
  }

  const trimmed = envValue.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  return resolve(trimmed);
}

export function listPairflowWorkspaceCandidateCwds(
  cwdInput?: string,
  envValue: string | undefined = process.env[pairflowWorktreeRootEnvVar]
): string[] {
  const requestedCwd = resolve(cwdInput ?? process.cwd());
  const fallbackWorktreeRoot = resolvePairflowWorktreeRootFromEnv(envValue);

  if (
    fallbackWorktreeRoot === undefined
    || fallbackWorktreeRoot === requestedCwd
  ) {
    return [requestedCwd];
  }

  return [requestedCwd, fallbackWorktreeRoot];
}
