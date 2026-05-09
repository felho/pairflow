import { resolve } from "node:path";

import { parseBubbleConfigToml } from "../../../config/bubbleConfig.js";
import { getBubblePaths } from "../../shared/bubble/bubblePaths.js";
import { runListEntryProjectionPipeline } from "./internal/projection/listEntryProjectionPipeline.js";
import type { BubbleBuildResult } from "./internal/projection/types.js";
import type { ListReadModelDependencies } from "./listReadModelDependencies.js";
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

  return runListEntryProjectionPipeline({
    repoPath: input.repoPath,
    bubbleId: input.bubbleId,
    bubblePaths,
    sessions: input.sessions,
    now: input.now,
    refresh: input.refresh,
    dependencies: input.dependencies,
    config,
    stateLoaded,
    paneActivityRead,
    remotePointer
  });
}
