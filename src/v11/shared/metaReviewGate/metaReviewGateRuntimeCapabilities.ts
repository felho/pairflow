import type { AgentName } from "../../../contracts/kernel/agentIdentity.js";
import type {
  PairflowCommandProfile,
  RoleMcpPolicy
} from "../config/bubbleConfigVocabulary.js";
import type { MetaReviewArtifactReadPort } from "../metaReview/metaReviewArtifactIo.js";
import type { ResolveBubbleByIdPort } from "../../ports/bubbleLookup.js";
import type { SetMetaReviewerPaneBindingPort } from "../../ports/runtimeSessions.js";
import type {
  ReadStateSnapshotPort,
  WriteStateSnapshotPort
} from "../../ports/stateSnapshots.js";
import type {
  AppendProtocolEnvelopePort,
  ReadTranscriptEnvelopesPort
} from "../../ports/transcript.js";
import type { MetaReviewGateTmuxRunner } from "./metaReviewGateTmuxCapabilities.js";

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
    roleName?: "implementer" | "reviewer" | "meta_reviewer";
    roleMcpPolicy?: RoleMcpPolicy;
    startupPrompt?: string | undefined;
  }) => string;
  tmux?: MetaReviewGatePaneBindingTmuxCapabilities;
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
  metaReviewerMcpPolicy?: RoleMcpPolicy;
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
