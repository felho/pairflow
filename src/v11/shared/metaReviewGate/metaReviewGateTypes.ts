import type {
  MetaReviewArtifactReadPort,
} from "../metaReview/metaReviewArtifactIo.js";
import type { MetaReviewGateTmuxRunner } from "./internal/metaReviewGateTmuxCapabilities.js";
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
import type {
  AgentName,
  PairflowCommandProfile
} from "../../../types/bubble.js";
import type {
  MetaReviewResult
} from "../metaReview/metaReviewTypes.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type { MetaReviewGateRoute } from "../../domain/metaReviewGate/gateRoutingTypes.js";
export {
  MetaReviewGateError,
  metaReviewGateRoutes
} from "../../domain/metaReviewGate/gateRoutingTypes.js";
export type {
  MetaReviewGateErrorDiagnostics,
  MetaReviewGateReasonCode,
  MetaReviewGateRoute,
  MetaReviewGateThresholdMetadata,
  MetaReviewGateThresholdStatus
} from "../../domain/metaReviewGate/gateRoutingTypes.js";

export interface NotifyMetaReviewerSubmissionRequestInput {
  bubbleId: string;
  round: number;
  targetPane: string;
  metaReviewerAgent: AgentName;
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
}

function hasDefinedValues(record: Record<string, unknown>): boolean {
  return Object.values(record).some((value) => value !== undefined);
}

export function resolveMetaReviewGateNotifyTmuxCapabilities(
  runtime: MetaReviewGateNotifyRuntimeCapabilities | undefined
): MetaReviewGateNotifyTmuxCapabilities | undefined {
  const runner = runtime?.tmux?.runner;
  const maybeAcceptTrustPrompt = runtime?.tmux?.maybeAcceptTrustPrompt;
  const sendSubmissionRequestMessage = runtime?.tmux?.sendSubmissionRequestMessage;
  const submitPaneInput = runtime?.tmux?.submitPaneInput;
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
    agentName: AgentName;
    bubbleId: string;
    workspacePath?: string;
    worktreePath?: string;
    pairflowCommandProfile?: PairflowCommandProfile;
    startupPrompt?: string | undefined;
  }) => string;
  tmux?: MetaReviewGatePaneBindingTmuxCapabilities;
}

export function resolveMetaReviewGatePaneBindingTmuxCapabilities(
  runtime: MetaReviewGatePaneBindingRuntimeCapabilities | undefined
): MetaReviewGatePaneBindingTmuxCapabilities | undefined {
  const runner = runtime?.tmux?.runner;
  const respawnPaneCommand = runtime?.tmux?.respawnPaneCommand;
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
  metaReviewerAgent: AgentName;
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
