import { randomUUID } from "node:crypto";

import { metaReviewLiveRunDefaults } from "../metaReviewDependencyDefaults.js";
import type { MetaReviewDependencies, MetaReviewLiveRunnerOutput } from "./metaReviewLiveRunContract.js";

export interface ResolvedMetaReviewLiveRunPorts {
  resolveBubble: typeof metaReviewLiveRunDefaults.resolveBubbleById;
  readState: typeof metaReviewLiveRunDefaults.readStateSnapshot;
  writeState: typeof metaReviewLiveRunDefaults.writeStateSnapshot;
  appendEnvelope: typeof metaReviewLiveRunDefaults.appendProtocolEnvelope;
  runLiveReview: NonNullable<MetaReviewDependencies["runLiveReview"]>;
  now: Date;
  makeUuid: () => string;
}

export function unavailableMetaReviewLiveRunner(): Promise<MetaReviewLiveRunnerOutput> {
  return Promise.reject(new Error("Meta-review runner adapter is unavailable."));
}

export function resolveMetaReviewLiveRunPorts(
  dependencies: MetaReviewDependencies
): ResolvedMetaReviewLiveRunPorts {
  return {
    resolveBubble: dependencies.resolveBubbleById ?? metaReviewLiveRunDefaults.resolveBubbleById,
    readState: dependencies.readStateSnapshot ?? metaReviewLiveRunDefaults.readStateSnapshot,
    writeState: dependencies.writeStateSnapshot ?? metaReviewLiveRunDefaults.writeStateSnapshot,
    appendEnvelope:
      dependencies.appendProtocolEnvelope ??
      metaReviewLiveRunDefaults.appendProtocolEnvelope,
    runLiveReview: dependencies.runLiveReview ?? unavailableMetaReviewLiveRunner,
    now: dependencies.now ?? new Date(),
    makeUuid: dependencies.randomUUID ?? randomUUID
  };
}
