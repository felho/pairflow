import type { parseBubbleConfigToml } from "../../../../../config/bubbleConfig.js";
import type { getBubblePaths } from "../../../../shared/bubble/bubblePaths.js";
import type { BubbleRemotePointer } from "../../../../shared/remote/remoteExecutionTypes.js";
import { isRefreshFallbackEligibleError } from "../error/listReadModelErrors.js";
import type { ListReadModelDependencies } from "../../listReadModelDependencies.js";
import {
  buildCachedRemoteBubbleListEntry,
  buildCreatedRemoteBubbleListEntry,
  buildLocalBubbleListEntry,
  buildRefreshedRemoteBubbleListEntry,
  buildUnavailableRemoteBubbleListEntry
} from "./entryProjection.js";
import { readRemoteStateCacheSafe } from "./remoteStateCacheRead.js";
import type { BubbleBuildResult, RemoteRefreshFailureMetadata } from "./types.js";

export async function runListEntryProjectionPipeline(input: {
  repoPath: string;
  bubbleId: string;
  bubblePaths: ReturnType<typeof getBubblePaths>;
  sessions: Awaited<
    ReturnType<ListReadModelDependencies["readRuntimeSessionsRegistry"]>
  >;
  now: Date;
  refresh: boolean;
  dependencies: ListReadModelDependencies;
  config: ReturnType<typeof parseBubbleConfigToml>;
  stateLoaded: Awaited<ReturnType<ListReadModelDependencies["inspectStateSnapshot"]>>;
  paneActivityRead: Awaited<
    ReturnType<ListReadModelDependencies["readWatchdogPaneActivity"]>
  >;
  remotePointer: BubbleRemotePointer | null;
}): Promise<BubbleBuildResult> {
  if (input.remotePointer === null) {
    return buildLocalBubbleListEntry({
      repoPath: input.repoPath,
      bubbleId: input.bubbleId,
      bubblePaths: input.bubblePaths,
      sessions: input.sessions,
      now: input.now,
      config: input.config,
      stateLoaded: input.stateLoaded,
      paneActivityRead: input.paneActivityRead
    });
  }

  if (input.remotePointer.kind === "created") {
    return buildCreatedRemoteBubbleListEntry({
      repoPath: input.repoPath,
      bubbleId: input.bubbleId,
      bubblePaths: input.bubblePaths,
      config: input.config,
      stateLoaded: input.stateLoaded,
      remotePointer: input.remotePointer
    });
  }

  const cacheResult = await readRemoteStateCacheSafe(
    input.bubblePaths.remoteStateCachePath,
    input.dependencies
  );
  if (input.refresh) {
    const refreshFailure: RemoteRefreshFailureMetadata = {
      reasonCode: "LIST_REMOTE_REFRESH_UNAVAILABLE",
      refreshAttemptedAt: input.now.toISOString()
    };
    try {
      return await buildRefreshedRemoteBubbleListEntry({
        repoPath: input.repoPath,
        bubbleId: input.bubbleId,
        bubblePaths: input.bubblePaths,
        config: input.config,
        remotePointer: input.remotePointer,
        now: input.now,
        dependencies: input.dependencies
      });
    } catch (error) {
      if (!isRefreshFallbackEligibleError(error)) {
        throw error;
      }
      if (cacheResult.cache !== null) {
        return buildCachedRemoteBubbleListEntry({
          repoPath: input.repoPath,
          bubbleId: input.bubbleId,
          bubblePaths: input.bubblePaths,
          config: input.config,
          remotePointer: input.remotePointer,
          cache: cacheResult.cache,
          refreshFailure
        });
      }
      return buildUnavailableRemoteBubbleListEntry({
        repoPath: input.repoPath,
        bubbleId: input.bubbleId,
        bubblePaths: input.bubblePaths,
        config: input.config,
        stateLoaded: input.stateLoaded,
        remotePointer: input.remotePointer,
        cacheStatus: cacheResult.cacheStatus === "invalid" ? "invalid" : "missing",
        refreshFailure
      });
    }
  }

  if (cacheResult.cache !== null) {
    return buildCachedRemoteBubbleListEntry({
      repoPath: input.repoPath,
      bubbleId: input.bubbleId,
      bubblePaths: input.bubblePaths,
      config: input.config,
      remotePointer: input.remotePointer,
      cache: cacheResult.cache
    });
  }

  return buildUnavailableRemoteBubbleListEntry({
    repoPath: input.repoPath,
    bubbleId: input.bubbleId,
    bubblePaths: input.bubblePaths,
    config: input.config,
    stateLoaded: input.stateLoaded,
    remotePointer: input.remotePointer,
    cacheStatus: cacheResult.cacheStatus === "invalid" ? "invalid" : "missing"
  });
}
