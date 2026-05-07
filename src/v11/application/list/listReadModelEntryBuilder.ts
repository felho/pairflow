import { resolve } from "node:path";

import { parseBubbleConfigToml } from "../../../config/bubbleConfig.js";
import { getBubblePaths } from "../../shared/bubble/bubblePaths.js";
import type { ListReadModelDependencies } from "./listReadModelDependencies.js";
import { isRefreshFallbackEligibleError } from "./listReadModelErrors.js";
import {
  type BubbleBuildResult,
  type RemoteRefreshFailureMetadata,
  buildCachedRemoteBubbleListEntry,
  buildCreatedRemoteBubbleListEntry,
  buildLocalBubbleListEntry,
  buildRefreshedRemoteBubbleListEntry,
  buildUnavailableRemoteBubbleListEntry,
  readRemoteStateCacheSafe
} from "./listReadModelEntryProjection.js";
import { BubbleListError } from "./listReadModelErrors.js";

export async function buildBubbleListEntry(input: {
  repoPath: string;
  normalizedRepoPath: string;
  bubbleId: string;
  sessions: Awaited<
    ReturnType<ListReadModelDependencies["readRuntimeSessionsRegistry"]>
  >;
  now: Date;
  refresh: boolean;
  dependencies: ListReadModelDependencies;
}): Promise<BubbleBuildResult> {
  const bubblePaths = getBubblePaths(input.repoPath, input.bubbleId);
  const [bubbleToml, stateLoaded, paneActivityRead, remotePointer] = await Promise.all([
    input.dependencies.readBubbleTomlArtifact(bubblePaths.bubbleTomlPath),
    input.dependencies.inspectStateSnapshot(bubblePaths.statePath),
    input.dependencies.readWatchdogPaneActivity({
      runtimeDir: bubblePaths.runtimeDir,
      bubbleId: input.bubbleId
    }),
    input.dependencies.readRemotePointer(bubblePaths.remotePointerPath)
  ]);

  const config = parseBubbleConfigToml(bubbleToml);
  if (config.id !== input.bubbleId) {
    throw new BubbleListError(
      `Bubble config id mismatch: expected ${input.bubbleId}, found ${config.id}`
    );
  }

  const normalizedConfigRepoPath = await input.dependencies.normalizeRepoPath(
    resolve(config.repo_path)
  );
  if (normalizedConfigRepoPath !== input.normalizedRepoPath) {
    throw new BubbleListError(
      `Bubble ${input.bubbleId} belongs to different repository path: ${config.repo_path}`
    );
  }

  if (remotePointer === null) {
    return buildLocalBubbleListEntry({
      repoPath: input.repoPath,
      bubbleId: input.bubbleId,
      bubblePaths,
      sessions: input.sessions,
      now: input.now,
      config,
      stateLoaded,
      paneActivityRead
    });
  }

  if (remotePointer.kind === "created") {
    return buildCreatedRemoteBubbleListEntry({
      repoPath: input.repoPath,
      bubbleId: input.bubbleId,
      bubblePaths,
      config,
      stateLoaded,
      remotePointer
    });
  }

  const cacheResult = await readRemoteStateCacheSafe(
    bubblePaths.remoteStateCachePath,
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
        bubblePaths,
        config,
        remotePointer,
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
          bubblePaths,
          config,
          remotePointer,
          cache: cacheResult.cache,
          refreshFailure
        });
      }
      return buildUnavailableRemoteBubbleListEntry({
        repoPath: input.repoPath,
        bubbleId: input.bubbleId,
        bubblePaths,
        config,
        stateLoaded,
        remotePointer,
        cacheStatus: cacheResult.cacheStatus === "invalid" ? "invalid" : "missing",
        refreshFailure
      });
    }
  }

  if (cacheResult.cache !== null) {
    return buildCachedRemoteBubbleListEntry({
      repoPath: input.repoPath,
      bubbleId: input.bubbleId,
      bubblePaths,
      config,
      remotePointer,
      cache: cacheResult.cache
    });
  }

  return buildUnavailableRemoteBubbleListEntry({
    repoPath: input.repoPath,
    bubbleId: input.bubbleId,
    bubblePaths,
    config,
    stateLoaded,
    remotePointer,
    cacheStatus: cacheResult.cacheStatus === "invalid" ? "invalid" : "missing"
  });
}
