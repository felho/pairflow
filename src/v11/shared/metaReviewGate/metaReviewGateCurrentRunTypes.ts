import type { MetaReviewResult } from "../metaReview/metaReviewTypes.js";
import type { AppendProtocolEnvelopePort } from "../ports/transcript.js";
import type {
  LoadedStateSnapshot,
  WriteStateSnapshotPort
} from "../ports/stateSnapshots.js";
import type { BubbleConfig } from "../../../types/bubble.js";
import type { MetaReviewGateArtifactReadFn } from "./metaReviewGateFindingsMetadata.js";

export interface FinalizeCurrentRunMetaReviewGateInput {
  resolved: {
    bubbleId: string;
    bubbleConfig: Pick<
      BubbleConfig,
      "watchdog_timeout_minutes" | "agents" | "review_policy"
    >;
    bubblePaths: {
      artifactsDir: string;
      bubbleDir: string;
      inboxPath: string;
      locksDir: string;
      statePath: string;
      transcriptPath: string;
    };
  };
  loaded: LoadedStateSnapshot;
  now: Date;
  refs: string[];
  summary: string;
  runResult: MetaReviewResult;
  readFileFn: MetaReviewGateArtifactReadFn;
  appendEnvelope: AppendProtocolEnvelopePort;
  writeState: WriteStateSnapshotPort;
}
