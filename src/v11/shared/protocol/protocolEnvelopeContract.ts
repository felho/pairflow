import type {
  ApprovalDecision,
  FindingsClaimSource,
  FindingsClaimState,
  PassIntent,
  ProtocolMessageType,
  ProtocolParticipant
} from "../../../contracts/kernel/protocol.js";
import type { Finding } from "../../../contracts/kernel/findings.js";
import type {
  FindingsParityMetadata
} from "../metaReviewGate/findingsParityMetadataContract.js";

export interface ProtocolEnvelopeMetadata {
  [key: string]: unknown;
}

interface ProtocolEnvelopePayloadBase {
  summary?: string;
  question?: string;
  message?: string;
  decision?: ApprovalDecision;
  pass_intent?: PassIntent;
  findings_claim_state?: FindingsClaimState;
  findings_claim_source?: FindingsClaimSource;
  findings?: Finding[];
  metadata?: ProtocolEnvelopeMetadata;
}

export interface TaskProtocolEnvelopePayload {
  summary: string;
  metadata?: ProtocolEnvelopeMetadata;
}

export interface PassProtocolEnvelopePayload {
  summary: string;
  pass_intent?: PassIntent;
  findings_claim_state?: FindingsClaimState;
  findings_claim_source?: FindingsClaimSource;
  findings?: Finding[];
  metadata?: ProtocolEnvelopeMetadata;
}

export interface HumanQuestionProtocolEnvelopePayload {
  question: string;
  metadata?: ProtocolEnvelopeMetadata;
}

export interface HumanReplyProtocolEnvelopePayload {
  message: string;
  metadata?: ProtocolEnvelopeMetadata;
}

export interface ConvergenceProtocolEnvelopePayload {
  summary: string;
  advisory_findings_open_total: number;
  findings?: Finding[];
  metadata?: ProtocolEnvelopeMetadata;
}

export interface ApprovalRequestProtocolEnvelopePayload
  extends ProtocolEnvelopePayloadBase {
  summary?: string;
  findings?: Finding[];
  findings_parity?: FindingsParityMetadata;
}

export interface ApprovalDecisionProtocolEnvelopePayload {
  decision: ApprovalDecision;
  message?: string;
  findings?: Finding[];
  findings_parity?: FindingsParityMetadata;
  metadata?: ProtocolEnvelopeMetadata;
}

export interface CommitResultProtocolEnvelopePayload {
  summary?: string;
  question?: string;
  message?: string;
  decision?: ApprovalDecision;
  pass_intent?: PassIntent;
  findings_claim_state?: FindingsClaimState;
  findings_claim_source?: FindingsClaimSource;
  findings?: Finding[];
  metadata: ProtocolEnvelopeMetadata & {
    commit_sha: string;
    commit_message: string;
    staged_files: string[];
  };
}

export interface ProtocolEnvelopePayloadByType {
  TASK: TaskProtocolEnvelopePayload;
  PASS: PassProtocolEnvelopePayload;
  HUMAN_QUESTION: HumanQuestionProtocolEnvelopePayload;
  HUMAN_REPLY: HumanReplyProtocolEnvelopePayload;
  CONVERGENCE: ConvergenceProtocolEnvelopePayload;
  APPROVAL_REQUEST: ApprovalRequestProtocolEnvelopePayload;
  APPROVAL_DECISION: ApprovalDecisionProtocolEnvelopePayload;
  COMMIT_RESULT: CommitResultProtocolEnvelopePayload;
}

export type ProtocolEnvelopePayload =
  ProtocolEnvelopePayloadByType[ProtocolMessageType];

export type ProtocolEnvelopeDraft<
  TType extends ProtocolMessageType = ProtocolMessageType
> = TType extends ProtocolMessageType ? {
  bubble_id: string;
  sender: ProtocolParticipant;
  recipient: ProtocolParticipant;
  type: TType;
  round: number;
  payload: ProtocolEnvelopePayloadByType[TType];
  refs: string[];
} : never;

export type ProtocolEnvelope<
  TType extends ProtocolMessageType = ProtocolMessageType
> = TType extends ProtocolMessageType ? ProtocolEnvelopeDraft<TType> & {
  id: string;
  ts: string;
} : never;
