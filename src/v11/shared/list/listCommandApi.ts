import { isNamedError } from "../errors/namedError.js";
import type {
  BubbleListEntry,
  BubbleListInput,
  BubbleListView
} from "./listCommandContract.js";
import { BubbleListError, type BubbleListErrorNormalizationContext } from "./listCommandErrors.js";
import {
  createZeroCounts,
  resolveListBubblesContext,
  runtimeSessionExpectedStates
} from "./listCommandContext.js";
import { buildBubbleListEntry } from "./listCommandEntryBuilder.js";

export type {
  BubbleListEntry,
  BubbleListInput,
  BubbleListStateCounts,
  BubbleListView
} from "./listCommandContract.js";

export type {
  BubbleListErrorContext,
  BubbleListErrorInput,
  BubbleListErrorNormalizationContext
} from "./listCommandErrors.js";

export { BubbleListError } from "./listCommandErrors.js";

export async function listBubbles(input: BubbleListInput = {}): Promise<BubbleListView> {
  const {
    repoPath,
    bubbleIds,
    sessions,
    normalizedRepoPath,
    now
  } = await resolveListBubblesContext(input);

  const bubbles: BubbleListEntry[] = [];
  const byState = createZeroCounts();
  let runtimeRegistered = 0;
  let staleForNonRuntimeStates = 0;
  let staleForInvalidStates = 0;
  let createdNotStarted = 0;
  let unavailableStarted = 0;

  for (const bubbleId of bubbleIds) {
    const built = await buildBubbleListEntry({
      repoPath,
      normalizedRepoPath,
      bubbleId,
      sessions,
      now,
      refresh: input.refresh ?? false
    });
    if (built.hasRuntimeSession) {
      if (built.invalidState) {
        staleForInvalidStates += 1;
      } else if (runtimeSessionExpectedStates.has(built.entry.state)) {
        runtimeRegistered += 1;
      } else if (built.nonRuntimeState) {
        staleForNonRuntimeStates += 1;
      }
    }
    createdNotStarted += built.createdNotStarted;
    unavailableStarted += built.unavailableStarted;
    if (built.entry.remoteExecution?.stateSource !== "unavailable_started") {
      byState[built.entry.state] += 1;
    }
    bubbles.push(built.entry);
  }

  const bubbleIdSet = new Set(bubbleIds);
  const staleMissingBubble = Object.keys(sessions).filter(
    (bubbleId) => !bubbleIdSet.has(bubbleId)
  ).length;
  const stale = staleMissingBubble + staleForNonRuntimeStates + staleForInvalidStates;

  return {
    repoPath,
    total: bubbles.length,
    byState,
    runtimeSessions: {
      registered: runtimeRegistered,
      stale
    },
    bubbles,
    ...(bubbles.some((bubble) => bubble.remoteExecution !== undefined)
      ? {
          remoteExecutionSummary: {
            createdNotStarted,
            unavailableStarted,
            ...(bubbles.some(
              (bubble) => bubble.remoteExecution?.stateSource === "refresh"
            )
              ? { refreshedThisRun: true }
              : {})
          }
        }
      : {})
  };
}

export function asBubbleListError(
  error: unknown,
  context: BubbleListErrorNormalizationContext
): never {
  if (error instanceof BubbleListError) {
    throw error;
  }
  if (error instanceof Error) {
    throw new BubbleListError({
      message: error.message,
      cause: error,
      context: {
        source: isNamedError(error, "RepoResolutionError")
          ? "repo_resolution"
          : "unexpected_error",
        repoPathProvided: context.repoPathProvided,
        cwdProvided: context.cwdProvided,
        causeName: error.name
      }
    });
  }
  throw error;
}
