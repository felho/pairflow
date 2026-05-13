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

export interface ProtocolEnvelopeMetadata extends FindingsParityMetadata {
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

export interface TaskProtocolEnvelopePayload extends ProtocolEnvelopePayloadBase {
  summary?: string;
}

export interface PassProtocolEnvelopePayload extends ProtocolEnvelopePayloadBase {
  summary?: string;
  pass_intent?: PassIntent;
  findings_claim_state?: FindingsClaimState;
  findings_claim_source?: FindingsClaimSource;
  findings?: Finding[];
}

export interface HumanQuestionProtocolEnvelopePayload
  extends ProtocolEnvelopePayloadBase {
  question?: string;
}

export interface HumanReplyProtocolEnvelopePayload
  extends ProtocolEnvelopePayloadBase {
  message?: string;
}

export interface ConvergenceProtocolEnvelopePayload
  extends ProtocolEnvelopePayloadBase {
  summary?: string;
  findings?: Finding[];
}

export interface ApprovalRequestProtocolEnvelopePayload
  extends ProtocolEnvelopePayloadBase {
  summary?: string;
  findings?: Finding[];
}

export interface ApprovalDecisionProtocolEnvelopePayload
  extends ProtocolEnvelopePayloadBase {
  decision?: ApprovalDecision;
  message?: string;
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

export interface ProtocolEnvelopeDraft<TType extends ProtocolMessageType = ProtocolMessageType> {
  bubble_id: string;
  sender: ProtocolParticipant;
  recipient: ProtocolParticipant;
  type: TType;
  round: number;
  payload: ProtocolEnvelopePayloadByType[TType];
  refs: string[];
}

export interface ProtocolEnvelope<TType extends ProtocolMessageType = ProtocolMessageType>
  extends ProtocolEnvelopeDraft<TType> {
  id: string;
  ts: string;
}
