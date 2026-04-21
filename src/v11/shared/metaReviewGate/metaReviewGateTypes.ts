import type {
  MetaReviewArtifactReadPort,
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

export interface MetaReviewGateNotifyTmuxCapabilities {
  runner?: MetaReviewGateTmuxRunner;
  maybeAcceptTrustPrompt?: (
    runner: MetaReviewGateTmuxRunner,
    targetPane: string
  ) => Promise<boolean | void>;
  sendSubmissionRequestMessage?: (
    runner: MetaReviewGateTmuxRunner,
    targetPane: string,
    message: string
  ) => Promise<void>;
  submitPaneInput?: (
    runner: MetaReviewGateTmuxRunner,
    targetPane: string
  ) => Promise<void>;
}

export interface MetaReviewGateNotifyRuntimeCapabilities {
  tmux?: MetaReviewGateNotifyTmuxCapabilities;
  /** @deprecated Use `tmux.runner`. */
  runTmux?: MetaReviewGateTmuxRunner;
  /** @deprecated Use `tmux.maybeAcceptTrustPrompt`. */
  maybeAcceptClaudeTrustPrompt?: (
    runner: MetaReviewGateTmuxRunner,
    targetPane: string
  ) => Promise<boolean | void>;
  /** @deprecated Use `tmux.sendSubmissionRequestMessage`. */
  sendAndSubmitTmuxPaneMessage?: (
    runner: MetaReviewGateTmuxRunner,
    targetPane: string,
    message: string
  ) => Promise<void>;
  /** @deprecated Use `tmux.submitPaneInput`. */
  submitTmuxPaneInput?: (
    runner: MetaReviewGateTmuxRunner,
    targetPane: string
  ) => Promise<void>;
}

function hasDefinedValues(record: Record<string, unknown>): boolean {
  return Object.values(record).some((value) => value !== undefined);
}

export function resolveMetaReviewGateNotifyTmuxCapabilities(
  runtime: MetaReviewGateNotifyRuntimeCapabilities | undefined
): MetaReviewGateNotifyTmuxCapabilities | undefined {
  const runner = runtime?.tmux?.runner ?? runtime?.runTmux;
  const maybeAcceptTrustPrompt =
    runtime?.tmux?.maybeAcceptTrustPrompt
    ?? runtime?.maybeAcceptClaudeTrustPrompt;
  const sendSubmissionRequestMessage =
    runtime?.tmux?.sendSubmissionRequestMessage
    ?? runtime?.sendAndSubmitTmuxPaneMessage;
  const submitPaneInput =
    runtime?.tmux?.submitPaneInput
    ?? runtime?.submitTmuxPaneInput;
  const resolved = {
    ...(runner !== undefined ? { runner } : {}),
    ...(maybeAcceptTrustPrompt !== undefined
      ? { maybeAcceptTrustPrompt }
      : {}),
    ...(sendSubmissionRequestMessage !== undefined
      ? { sendSubmissionRequestMessage }
      : {}),
    ...(submitPaneInput !== undefined ? { submitPaneInput } : {})
  };

  return hasDefinedValues(resolved) ? resolved : undefined;
}

export interface NotifyMetaReviewerSubmissionRequestDependencies {
  runtime?: MetaReviewGateNotifyRuntimeCapabilities;
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

export interface MetaReviewGatePaneBindingTmuxCapabilities {
  runner?: MetaReviewGateTmuxRunner;
  respawnPaneCommand?: (input: {
    sessionName: string;
    paneIndex: number;
    cwd: string;
    command: string;
    runner?: MetaReviewGateTmuxRunner;
  }) => Promise<void>;
}

export interface MetaReviewGatePaneBindingRuntimeCapabilities {
  buildAgentCommand?: (input: {
    agentName: "codex";
    bubbleId: string;
    workspacePath?: string;
    worktreePath?: string;
    pairflowCommandProfile?: PairflowCommandProfile;
    startupPrompt?: string | undefined;
  }) => string;
  tmux?: MetaReviewGatePaneBindingTmuxCapabilities;
  /** @deprecated Use `tmux.runner`. */
  runTmux?: MetaReviewGateTmuxRunner;
  /** @deprecated Use `tmux.respawnPaneCommand`. */
  respawnTmuxPaneCommand?: (input: {
    sessionName: string;
    paneIndex: number;
    cwd: string;
    command: string;
    runner?: MetaReviewGateTmuxRunner;
  }) => Promise<void>;
}

export function resolveMetaReviewGatePaneBindingTmuxCapabilities(
  runtime: MetaReviewGatePaneBindingRuntimeCapabilities | undefined
): MetaReviewGatePaneBindingTmuxCapabilities | undefined {
  const runner = runtime?.tmux?.runner ?? runtime?.runTmux;
  const respawnPaneCommand =
    runtime?.tmux?.respawnPaneCommand
    ?? runtime?.respawnTmuxPaneCommand;
  const resolved = {
    ...(runner !== undefined ? { runner } : {}),
    ...(respawnPaneCommand !== undefined ? { respawnPaneCommand } : {})
  };

  return hasDefinedValues(resolved) ? resolved : undefined;
}

export interface MetaReviewGateRuntimeCapabilities {
  notify?: MetaReviewGateNotifyRuntimeCapabilities;
  paneBinding?: MetaReviewGatePaneBindingRuntimeCapabilities;
}

export interface ResolveMetaReviewerPaneWarningInput {
  setMetaReviewerPane: SetMetaReviewerPaneBindingPort;
  notifySubmissionRequest?: NotifyMetaReviewerSubmissionRequest;
  runtime?: MetaReviewGateRuntimeCapabilities;
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
  readTranscriptEnvelopes?: ReadTranscriptEnvelopesPort;
  setMetaReviewerPaneBinding?: SetMetaReviewerPaneBindingPort;
  notifyMetaReviewerSubmissionRequest?: NotifyMetaReviewerSubmissionRequest;
  resolveMetaReviewerPaneWarning?: ResolveMetaReviewerPaneWarning;
  runtime?: MetaReviewGateRuntimeCapabilities;
  readFile?: MetaReviewArtifactReadPort;
}

export interface MetaReviewGateResult {
  bubbleId: string;
  route: MetaReviewGateRoute;
  gateSequence: number;
  gateEnvelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
  metaReviewRun?: MetaReviewResult;
  warnings?: string[];
  diagnostics?: string[];
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
