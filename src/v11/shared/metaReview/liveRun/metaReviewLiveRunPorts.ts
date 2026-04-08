import { randomUUID } from "node:crypto";

import { resolveBubbleById } from "../../../../core/bubble/bubbleLookup.js";
import { readStateSnapshot, writeStateSnapshot } from "../../../../core/state/stateStore.js";
import { appendProtocolEnvelope } from "../../../../core/protocol/transcriptStore.js";
import { MetaReviewError } from "../metaReviewError.js";
import type { MetaReviewDependencies, MetaReviewLiveRunnerOutput } from "./metaReviewLiveRunContract.js";

export interface ResolvedMetaReviewLiveRunPorts {
  resolveBubble: typeof resolveBubbleById;
  readState: typeof readStateSnapshot;
  writeState: typeof writeStateSnapshot;
  appendEnvelope: typeof appendProtocolEnvelope;
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
    throw new MetaReviewError(
      "META_REVIEW_UNKNOWN_ERROR",
      "meta-review live-run artifact read capability is unavailable."
    );
  }

  const writeFileFn = dependencies.writeFile;
  if (writeFileFn === undefined) {
    throw new MetaReviewError(
      "META_REVIEW_UNKNOWN_ERROR",
      "meta-review live-run artifact write capability is unavailable."
    );
  }

  return {
    resolveBubble: dependencies.resolveBubbleById ?? resolveBubbleById,
    readState: dependencies.readStateSnapshot ?? readStateSnapshot,
    writeState: dependencies.writeStateSnapshot ?? writeStateSnapshot,
    appendEnvelope: dependencies.appendProtocolEnvelope ?? appendProtocolEnvelope,
    runLiveReview: dependencies.runLiveReview ?? unavailableMetaReviewLiveRunner,
    readFileFn,
    writeFileFn,
    now: dependencies.now ?? new Date(),
    makeUuid: dependencies.randomUUID ?? randomUUID
  };
}
