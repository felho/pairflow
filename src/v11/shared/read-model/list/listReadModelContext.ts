import { join } from "node:path";

import type { BubbleLifecycleState } from "../../../../types/bubble.js";
import { isNamedError } from "../../errors/namedError.js";
import type {
  BubbleListInput,
  BubbleListStateCounts
} from "./listReadModelContract.js";
import { listReadModelDefaults } from "./listReadModelDefaults.js";
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
  input: BubbleListInput
): Promise<{
  repoPath: string;
  bubbleIds: Awaited<ReturnType<typeof listReadModelDefaults.listBubbleIds>>;
  sessions: Awaited<ReturnType<typeof listReadModelDefaults.readRuntimeSessionsRegistry>>;
  normalizedRepoPath: string;
  now: Date;
}> {
  let repoPath: string;
  try {
    repoPath = await listReadModelDefaults.resolveRepoPath(input);
  } catch (error) {
    if (isNamedError(error, "RepoResolutionError")) {
      throw new BubbleListError(error.message);
    }
    throw error;
  }

  const bubbleIds = await listReadModelDefaults.listBubbleIds(repoPath);
  const sessionsPath = join(repoPath, ".pairflow", "runtime", "sessions.json");
  const sessions = await listReadModelDefaults.readRuntimeSessionsRegistry(sessionsPath, {
    allowMissing: true
  });
  return {
    repoPath,
    bubbleIds,
    sessions,
    normalizedRepoPath: await listReadModelDefaults.normalizeRepoPath(repoPath),
    now: input.now ?? new Date()
  };
}
