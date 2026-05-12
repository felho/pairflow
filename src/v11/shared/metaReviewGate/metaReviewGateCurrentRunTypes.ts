import type { MetaReviewResult } from "../metaReview/metaReviewTypes.js";
import type { AppendProtocolEnvelopePort } from "../../ports/transcript.js";
import type {
  LoadedDomainStateSnapshot,
  ReadDomainStateSnapshotPort,
  WriteDomainStateSnapshotPort
} from "../../ports/stateSnapshots.js";
import type { BubbleConfig } from "../config/bubbleConfigTypes.js";
import type {
  NotifyMetaReviewerSubmissionRequest,
  ResolveMetaReviewerPaneWarning,
  MetaReviewGateRuntimeCapabilities
} from "./metaReviewGateRuntimeCapabilities.js";
import type { SetMetaReviewerPaneBindingPort } from "../../ports/runtimeSessions.js";
import type { ReadTranscriptEnvelopesPort } from "../../ports/transcript.js";
import type { ValidationCommandId } from "../validation/validationCommandId.js";

export type MetaReviewGateArtifactReadFn = (
  artifactPath: string,
  encoding: "utf8"
) => Promise<string>;

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
        | "role_mcp"
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
  loaded: LoadedDomainStateSnapshot;
  now: Date;
  refs: string[];
  summary: string;
  runResult: MetaReviewResult;
  readFileFn: MetaReviewGateArtifactReadFn;
  appendEnvelope: AppendProtocolEnvelopePort;
  readState?: ReadDomainStateSnapshotPort;
  readTranscript?: ReadTranscriptEnvelopesPort;
  writeState: WriteDomainStateSnapshotPort;
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
