import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type {
  MetaReviewSubmissionPayload,
  ProtocolEnvelope
} from "../../../types/protocol.js";
import type { MetaReviewGateRoute } from "../metaReviewGate/metaReviewGateTypes.js";
import type {
  MetaReviewDeliveryEmitter,
  MetaReviewDeliveryMessageRefBuilder
} from "./metaReviewDeliveryCapabilities.js";
import type {
  MetaReviewArtifactReadPort
} from "./metaReviewArtifactIo.js";
import type { MetaReviewResult } from "./metaReviewTypes.js";
import type { AppendProtocolEnvelopePort } from "../ports/transcript.js";
import type { ResolveBubbleByIdPort } from "../ports/bubbleLookup.js";
import type { ReadRuntimeSessionsRegistryPort } from "../ports/runtimeSessions.js";
import type {
  ReadStateSnapshotPort,
  WriteStateSnapshotPort
} from "../ports/stateSnapshots.js";

export type { MetaReviewDepth, MetaReviewResult, MetaReviewRunWarning } from "./metaReviewTypes.js";

export interface MetaReviewSubmitInput {
  bubbleId: string;
  repoPath?: string;
  cwd?: string;
  round: number;
  recommendation: MetaReviewSubmissionPayload["recommendation"];
  summary: string;
  rework_target_message?: string | null;
  report_json: Record<string, unknown>;
  refs?: string[];
  expectedHandoffId?: string;
  expectedRole?: "implementer" | "reviewer" | "meta_reviewer";
  expectedRound?: number;
  expectedStateFingerprint?: string;
}

export interface MetaReviewCommandDependencies {
  resolveBubbleById?: ResolveBubbleByIdPort;
  readStateSnapshot?: ReadStateSnapshotPort;
  writeStateSnapshot?: WriteStateSnapshotPort;
  appendProtocolEnvelope?: AppendProtocolEnvelopePort;
  readRuntimeSessionsRegistry?: ReadRuntimeSessionsRegistryPort;
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
  lifecycle_state: BubbleStateSnapshot["state"];
  report_json: Record<string, unknown>;
  gate_route: MetaReviewGateRoute;
  gate_sequence: number;
  gate_envelope_type: ProtocolEnvelope["type"];
};
