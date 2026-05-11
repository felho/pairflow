import type { PersistedBubbleStateSnapshot } from "../../domain/state/snapshot/persistedBubbleStateSnapshot.js";
import type {
  MetaReviewSubmissionPayload,
  ProtocolEnvelope
} from "../../../types/protocol.js";
import type { MetaReviewGateRoute } from "../metaReviewGate/index.js";
import type {
  DeliveryAck,
  EmitDeliveryNotificationInput,
  ResolveDeliveryMessageRefInput
} from "../delivery/tmuxDeliveryContract.js";
import type { MetaReviewArtifactReadPort } from "./metaReviewArtifactIo.js";
import type { MetaReviewResult } from "./metaReviewTypes.js";
import type {
  AppendProtocolEnvelopePort,
  ReadTranscriptEnvelopesPort
} from "../../ports/transcript.js";
import type { ResolveBubbleByIdPort } from "../../ports/bubbleLookup.js";
import type {
  ReadRuntimeSessionsRegistryPort,
  SetMetaReviewerPaneBindingPort
} from "../../ports/runtimeSessions.js";
import type {
  ReadStateSnapshotPort,
  WriteStateSnapshotPort
} from "../../ports/stateSnapshots.js";
import type {
  MetaReviewGateRuntimeCapabilities,
  NotifyMetaReviewerSubmissionRequest,
  ResolveMetaReviewerPaneWarning,
  FinalizeCurrentRunMetaReviewGateInput
} from "../metaReviewGate/index.js";

export type { MetaReviewResult, MetaReviewRunWarning } from "./metaReviewTypes.js";

export type MetaReviewDeliveryEmitter = (
  input: EmitDeliveryNotificationInput
) => Promise<DeliveryAck>;

export type MetaReviewDeliveryMessageRefBuilder = (
  input: ResolveDeliveryMessageRefInput
) => string;

export type MetaReviewSubmitInput = {
  bubbleId: string;
  repoPath?: string;
  cwd?: string;
  round: number;
  recommendation: MetaReviewSubmissionPayload["recommendation"];
  summary: string;
  rework_target_message?: string | null;
  report_json: Record<string, unknown>;
  refs?: string[];
} & (
  | {
      expectedHandoffId?: undefined;
      expectedExecutionId?: undefined;
      expectedRole?: "implementer" | "reviewer" | "meta_reviewer";
      expectedRound?: number;
      expectedStateFingerprint?: string;
    }
  | {
      expectedHandoffId: string;
      expectedExecutionId: string;
      expectedRole?: "implementer" | "reviewer" | "meta_reviewer";
      expectedRound?: number;
      expectedStateFingerprint?: string;
    }
);

export interface MetaReviewCommandDependencies {
  resolveBubbleById?: ResolveBubbleByIdPort;
  readStateSnapshot?: ReadStateSnapshotPort;
  writeStateSnapshot?: WriteStateSnapshotPort;
  appendProtocolEnvelope?: AppendProtocolEnvelopePort;
  readTranscriptEnvelopes?: ReadTranscriptEnvelopesPort;
  readRuntimeSessionsRegistry?: ReadRuntimeSessionsRegistryPort;
  setMetaReviewerPaneBinding?: SetMetaReviewerPaneBindingPort;
  notifyMetaReviewerSubmissionRequest?: NotifyMetaReviewerSubmissionRequest;
  resolveMetaReviewerPaneWarning?: ResolveMetaReviewerPaneWarning;
  runtime?: MetaReviewGateRuntimeCapabilities;
  observeGateResultReconciled?: () => void;
  runMetaReviewApproveValidationCommand?:
    FinalizeCurrentRunMetaReviewGateInput["runMetaReviewApproveValidationCommand"];
  emitDeliveryNotification?: MetaReviewDeliveryEmitter;
  buildDeliveryMessageRef?: MetaReviewDeliveryMessageRefBuilder;
  readFile?: MetaReviewArtifactReadPort;
  now?: Date;
  randomUUID?: () => string;
}

export type MetaReviewSubmitResult = Omit<
  MetaReviewResult,
  "bubble_id" | "report_json"
> & {
  bubbleId: string;
  lifecycle_state: PersistedBubbleStateSnapshot["state"];
  report_json: Record<string, unknown>;
  gate_route: MetaReviewGateRoute;
  gate_sequence: number;
  gate_envelope_type: ProtocolEnvelope["type"];
};
