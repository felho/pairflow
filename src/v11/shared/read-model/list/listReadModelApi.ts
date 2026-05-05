import { constants as fsConstants } from "node:fs";
import { access } from "node:fs/promises";

import { isNamedError } from "../../errors/namedError.js";
import { getBubblePaths } from "../../bubble/bubblePaths.js";
import type {
  BubbleListEntry,
  BubbleListInput,
  BubbleListView
} from "./listReadModelContract.js";
import { BubbleListError, type BubbleListErrorNormalizationContext } from "./listReadModelErrors.js";
import {
  createZeroCounts,
  resolveListBubblesContext,
  runtimeSessionExpectedStates
} from "./listReadModelContext.js";
import { buildBubbleListEntry } from "./listReadModelEntryBuilder.js";

export type {
  BubbleListEntry,
  BubbleListInput,
  BubbleListStateCounts,
  BubbleListView
} from "./listReadModelContract.js";

export type {
  BubbleListErrorContext,
  BubbleListErrorInput,
  BubbleListErrorNormalizationContext
} from "./listReadModelErrors.js";

export { BubbleListError } from "./listReadModelErrors.js";

async function pathExists(path: string): Promise<boolean> {
  return access(path, fsConstants.F_OK)
    .then(() => true)
    .catch((error: unknown) => {
      if (
        typeof error === "object"
        && error !== null
        && "code" in error
        && (error.code === "ENOENT" || error.code === "ENOTDIR")
      ) {
        return false;
      }
      throw error;
    });
}

async function shouldSkipDeletedBubbleDuringList(input: {
  repoPath: string;
  bubbleId: string;
  error: unknown;
}): Promise<boolean> {
  if (
    typeof input.error !== "object"
    || input.error === null
    || !("code" in input.error)
    || (
      input.error.code !== "ENOENT"
      && input.error.code !== "ENOTDIR"
    )
  ) {
    return false;
  }

  const bubblePaths = getBubblePaths(input.repoPath, input.bubbleId);
  return !(await pathExists(bubblePaths.bubbleTomlPath));
}

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
    let built;
    try {
      built = await buildBubbleListEntry({
        repoPath,
        normalizedRepoPath,
        bubbleId,
        sessions,
        now,
        refresh: input.refresh ?? false
      });
    } catch (error) {
      if (
        await shouldSkipDeletedBubbleDuringList({
          repoPath,
          bubbleId,
          error
        })
      ) {
        continue;
      }
      throw error;
    }
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
