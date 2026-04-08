import type {
  MetaReviewArtifactReadPort,
  MetaReviewArtifactWritePort
} from "../metaReview/metaReviewArtifactIo.js";
import type { MetaReviewGateTmuxRunner } from "./metaReviewGateTmuxCapabilities.js";
import type { ResolveBubbleByIdPort } from "../ports/bubbleLookup.js";
import type {
  ReadStateSnapshotPort,
  WriteStateSnapshotPort
} from "../ports/stateSnapshots.js";
import type { SetMetaReviewerPaneBindingPort } from "../ports/runtimeSessions.js";
import type {
  AppendProtocolEnvelopePort,
  ReadTranscriptEnvelopesPort
} from "../ports/transcript.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { PairflowCommandProfile } from "../../../types/bubble.js";
import type {
  MetaReviewResult
} from "../metaReview/metaReviewTypes.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";

export type MetaReviewGateRoute =
  | "meta_review_running"
  | "auto_rework"
  | "human_gate_sticky_bypass"
  | "human_gate_approve"
  | "human_gate_budget_exhausted"
  | "human_gate_inconclusive"
  | "human_gate_run_failed"
  | "human_gate_dispatch_failed";

export type MetaReviewGateReasonCode =
  | "META_REVIEW_GATE_RUN_FAILED"
  | "META_REVIEW_GATE_REWORK_DISPATCH_FAILED"
  | "META_REVIEW_GATE_STATE_CONFLICT"
  | "META_REVIEW_GATE_TRANSITION_INVALID";

export interface NotifyMetaReviewerSubmissionRequestInput {
  bubbleId: string;
  round: number;
  targetPane: string;
}

export interface NotifyMetaReviewerSubmissionRequestDependencies {
  runTmux?: MetaReviewGateTmuxRunner;
}

export interface MetaReviewRuntimeDeliveryObservation {
  status: "confirmed" | "uncertain" | "failed";
  reasonCode: string | null;
  message: string;
}

export type NotifyMetaReviewerSubmissionRequest = (
  input: NotifyMetaReviewerSubmissionRequestInput,
  dependencies?: NotifyMetaReviewerSubmissionRequestDependencies
) => Promise<MetaReviewRuntimeDeliveryObservation>;

export interface ResolveMetaReviewerPaneWarningInput {
  setMetaReviewerPane: SetMetaReviewerPaneBindingPort;
  notifySubmissionRequest: NotifyMetaReviewerSubmissionRequest;
  runTmuxRunner: MetaReviewGateTmuxRunner;
  sessionsPath: string;
  bubbleId: string;
  round: number;
  now: Date;
  taskArtifactPath: string;
  pairflowCommandProfile: PairflowCommandProfile;
}

export type ResolveMetaReviewerPaneWarning = (
  input: ResolveMetaReviewerPaneWarningInput
) => Promise<{
  delivery: MetaReviewRuntimeDeliveryObservation;
  shouldDeactivate: boolean;
}>;

export interface ApplyMetaReviewGateOnConvergenceInput {
  bubbleId: string;
  summary: string;
  refs?: string[];
  findings?: Array<{
    severity: "P2" | "P3";
    title: string;
    refs?: string[];
  }>;
  repoPath?: string;
  cwd?: string;
  now?: Date;
}

export interface ApplyMetaReviewGateOnConvergenceDependencies {
  resolveBubbleById?: ResolveBubbleByIdPort;
  readStateSnapshot?: ReadStateSnapshotPort;
  writeStateSnapshot?: WriteStateSnapshotPort;
  appendProtocolEnvelope?: AppendProtocolEnvelopePort;
  setMetaReviewerPaneBinding?: SetMetaReviewerPaneBindingPort;
  notifyMetaReviewerSubmissionRequest?: NotifyMetaReviewerSubmissionRequest;
  resolveMetaReviewerPaneWarning?: ResolveMetaReviewerPaneWarning;
  runTmux?: MetaReviewGateTmuxRunner;
  readFile?: MetaReviewArtifactReadPort;
}

export interface RecoverMetaReviewGateFromSnapshotInput {
  bubbleId: string;
  refs?: string[];
  summary?: string;
  repoPath?: string;
  cwd?: string;
  now?: Date;
  runResult?: MetaReviewResult;
}

export interface RecoverMetaReviewGateFromSnapshotDependencies {
  resolveBubbleById?: ResolveBubbleByIdPort;
  readStateSnapshot?: ReadStateSnapshotPort;
  writeStateSnapshot?: WriteStateSnapshotPort;
  appendProtocolEnvelope?: AppendProtocolEnvelopePort;
  readTranscriptEnvelopes?: ReadTranscriptEnvelopesPort;
  setMetaReviewerPaneBinding?: SetMetaReviewerPaneBindingPort;
  readFile?: MetaReviewArtifactReadPort;
  writeFile?: MetaReviewArtifactWritePort;
  sleepForRetryMs?: (delayMs: number) => Promise<void>;
}

export interface MetaReviewGateResult {
  bubbleId: string;
  route: MetaReviewGateRoute;
  gateSequence: number;
  gateEnvelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
  metaReviewRun?: MetaReviewResult;
}

export interface MetaReviewGateErrorDiagnostics {
  bubbleId?: string;
  round?: number;
  rollbackReasonCode?: string;
  rollbackOutcome?: "not_attempted" | "applied" | "failed";
  rollbackTargetState?: BubbleStateSnapshot["state"];
  stageReasonCode?: string;
  restoreReasonCode?: string;
  retryInvariantReasonCode?: string;
}

export class MetaReviewGateError extends Error {
  public readonly reasonCode: MetaReviewGateReasonCode;
  public readonly diagnostics: MetaReviewGateErrorDiagnostics | undefined;

  public constructor(
    reasonCode: MetaReviewGateReasonCode,
    message: string,
    diagnostics?: MetaReviewGateErrorDiagnostics
  ) {
    super(message);
    this.name = "MetaReviewGateError";
    this.reasonCode = reasonCode;
    this.diagnostics = diagnostics;
  }
}
