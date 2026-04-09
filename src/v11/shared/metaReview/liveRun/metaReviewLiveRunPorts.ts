import { randomUUID } from "node:crypto";

import { metaReviewLiveRunDefaults } from "../metaReviewDependencyDefaults.js";
import { MetaReviewError } from "../metaReviewError.js";
import type { MetaReviewDependencies, MetaReviewLiveRunnerOutput } from "./metaReviewLiveRunContract.js";

export interface ResolvedMetaReviewLiveRunPorts {
  resolveBubble: typeof metaReviewLiveRunDefaults.resolveBubbleById;
  readState: typeof metaReviewLiveRunDefaults.readStateSnapshot;
  writeState: typeof metaReviewLiveRunDefaults.writeStateSnapshot;
  appendEnvelope: typeof metaReviewLiveRunDefaults.appendProtocolEnvelope;
  runLiveReview: NonNullable<MetaReviewDependencies["runLiveReview"]>;
  readFileFn: NonNullable<MetaReviewDependencies["readFile"]>;
  writeFileFn: NonNullable<MetaReviewDependencies["writeFile"]>;
  now: Date;
  makeUuid: () => string;
}

export function unavailableMetaReviewLiveRunner(): Promise<MetaReviewLiveRunnerOutput> {
  return Promise.reject(new Error("Meta-review runner adapter is unavailable."));
}

export function resolveMetaReviewLiveRunPorts(
  dependencies: MetaReviewDependencies
): ResolvedMetaReviewLiveRunPorts {
  const readFileFn = dependencies.readFile;
  if (readFileFn === undefined) {
    throw new MetaReviewError({
      reasonCode: "META_REVIEW_UNKNOWN_ERROR",
      message: "meta-review live-run artifact read capability is unavailable.",
      context: {
        source: "meta_review_live_run_ports",
        reason: "artifact_read_capability_unavailable"
      }
    });
  }

  const writeFileFn = dependencies.writeFile;
  if (writeFileFn === undefined) {
    throw new MetaReviewError({
      reasonCode: "META_REVIEW_UNKNOWN_ERROR",
      message: "meta-review live-run artifact write capability is unavailable.",
      context: {
        source: "meta_review_live_run_ports",
        reason: "artifact_write_capability_unavailable"
      }
    });
  }

  return {
    resolveBubble: dependencies.resolveBubbleById ?? metaReviewLiveRunDefaults.resolveBubbleById,
    readState: dependencies.readStateSnapshot ?? metaReviewLiveRunDefaults.readStateSnapshot,
    writeState: dependencies.writeStateSnapshot ?? metaReviewLiveRunDefaults.writeStateSnapshot,
    appendEnvelope:
      dependencies.appendProtocolEnvelope ??
      metaReviewLiveRunDefaults.appendProtocolEnvelope,
    runLiveReview: dependencies.runLiveReview ?? unavailableMetaReviewLiveRunner,
    readFileFn,
    writeFileFn,
    now: dependencies.now ?? new Date(),
    makeUuid: dependencies.randomUUID ?? randomUUID
  };
}
