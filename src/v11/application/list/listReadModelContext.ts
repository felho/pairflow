import { join } from "node:path";

import type { BubbleLifecycleState } from "../../domain/state/lifecycleTypes.js";
import { isNamedError } from "../../shared/errors/namedError.js";
import type {
  BubbleListInput,
  BubbleListStateCounts
} from "../../shared/read-model/list/listReadModelContract.js";
import type { ListReadModelDependencies } from "./listReadModelDependencies.js";
import { BubbleListError } from "./listReadModelErrors.js";

export const runtimeSessionExpectedStates = new Set<BubbleLifecycleState>([
  "RUNNING",
  "WAITING_HUMAN",
  "READY_FOR_HUMAN_APPROVAL",
  "APPROVED_FOR_COMMIT",
  "COMMITTED"
]);

export function createZeroCounts(): BubbleListStateCounts {
  return {
    CREATED: 0,
    PREPARING_WORKSPACE: 0,
    RUNNING: 0,
    WAITING_HUMAN: 0,
    READY_FOR_HUMAN_APPROVAL: 0,
    APPROVED_FOR_COMMIT: 0,
    COMMITTED: 0,
    DONE: 0,
    FAILED: 0,
    CANCELLED: 0
  };
}

export async function resolveListBubblesContext(
  input: BubbleListInput,
  dependencies: ListReadModelDependencies
): Promise<{
  repoPath: string;
  bubbleIds: Awaited<ReturnType<ListReadModelDependencies["listBubbleIds"]>>;
  sessions: Awaited<
    ReturnType<ListReadModelDependencies["readRuntimeSessionsRegistry"]>
  >;
  normalizedRepoPath: string;
  now: Date;
}> {
  let repoPath: string;
  try {
    repoPath = await dependencies.resolveRepoPath(input);
  } catch (error) {
    if (isNamedError(error, "RepoResolutionError")) {
      throw new BubbleListError(error.message);
    }
    throw error;
  }

  const bubbleIds = await dependencies.listBubbleIds(repoPath);
  const sessionsPath = join(repoPath, ".pairflow", "runtime", "sessions.json");
  const sessions = await dependencies.readRuntimeSessionsRegistry(sessionsPath, {
    allowMissing: true
  });
  return {
    repoPath,
    bubbleIds,
    sessions,
    normalizedRepoPath: await dependencies.normalizeRepoPath(repoPath),
    now: input.now ?? new Date()
  };
}
