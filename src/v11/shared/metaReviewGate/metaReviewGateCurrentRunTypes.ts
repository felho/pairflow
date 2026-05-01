import type { MetaReviewResult } from "../metaReview/metaReviewTypes.js";
import type { AppendProtocolEnvelopePort } from "../ports/transcript.js";
import type {
  LoadedStateSnapshot,
  ReadStateSnapshotPort,
  WriteStateSnapshotPort
} from "../ports/stateSnapshots.js";
import type { BubbleConfig } from "../../../types/bubble.js";
import type { MetaReviewGateArtifactReadFn } from "./metaReviewGateFindingsMetadata.js";
import type {
  NotifyMetaReviewerSubmissionRequest,
  ResolveMetaReviewerPaneWarning,
  MetaReviewGateRuntimeCapabilities
} from "./metaReviewGateTypes.js";
import type { SetMetaReviewerPaneBindingPort } from "../ports/runtimeSessions.js";
import type { ReadTranscriptEnvelopesPort } from "../ports/transcript.js";

export interface FinalizeCurrentRunMetaReviewGateInput {
  resolved: {
    bubbleId: string;
    bubbleConfig: Pick<
      BubbleConfig,
      "watchdog_timeout_minutes" | "agents" | "review_policy"
    > & Partial<Pick<BubbleConfig, "pairflow_command_profile">>;
    bubblePaths: {
      artifactsDir: string;
      bubbleDir: string;
      inboxPath: string;
      locksDir: string;
      sessionsPath?: string;
      statePath: string;
      taskArtifactPath?: string;
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
  readState?: ReadStateSnapshotPort;
  readTranscript?: ReadTranscriptEnvelopesPort;
  writeState: WriteStateSnapshotPort;
  setMetaReviewerPane?: SetMetaReviewerPaneBindingPort;
  notifySubmissionRequest?: NotifyMetaReviewerSubmissionRequest;
  resolvePaneWarning?: ResolveMetaReviewerPaneWarning;
  runtime?: MetaReviewGateRuntimeCapabilities;
  observeGateResultReconciled?: () => void;
}
