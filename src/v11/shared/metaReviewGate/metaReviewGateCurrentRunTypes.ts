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
} from "./metaReviewGateRuntimeCapabilities.js";
import type { SetMetaReviewerPaneBindingPort } from "../ports/runtimeSessions.js";
import type { ReadTranscriptEnvelopesPort } from "../ports/transcript.js";
import type { ValidationCommandId } from "../validation/validationCommandId.js";

export interface MetaReviewApproveValidationCommandRunInput {
  kind: ValidationCommandId;
  command: string;
  worktreePath: string;
  cwd?: string;
  evidence?: {
    header: string;
    logPathPrefix: string;
    timestamp?: number;
  };
  targetId?: string;
  targetPaths?: string[];
}

export interface FinalizeCurrentRunMetaReviewGateInput {
  resolved: {
    bubbleId: string;
    bubbleConfig: Pick<
      BubbleConfig,
      | "watchdog_timeout_minutes"
      | "agents"
      | "review_policy"
    > & Partial<
      Pick<
        BubbleConfig,
        | "pairflow_command_profile"
        | "commands"
        | "review_artifact_type"
        | "validation_target"
      >
    >;
    bubblePaths: {
      artifactsDir: string;
      bubbleDir: string;
      inboxPath: string;
      locksDir: string;
      sessionsPath?: string;
      statePath: string;
      taskArtifactPath?: string;
      transcriptPath: string;
      worktreePath?: string;
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
  runMetaReviewApproveValidationCommand?: (
    input: MetaReviewApproveValidationCommandRunInput
  ) => Promise<{
    command: string;
    exitCode: number;
    logPath: string;
    durationMs: number;
    executionCwd: string;
  }>;
}
