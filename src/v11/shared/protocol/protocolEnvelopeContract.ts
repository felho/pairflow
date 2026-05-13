import type {
  ApprovalDecision,
  FindingsClaimSource,
  FindingsClaimState,
  PassIntent,
  ProtocolMessageType,
  ProtocolParticipant
} from "../../../contracts/kernel/protocol.js";
import type {
  FindingsParityMetadata
} from "../metaReviewGate/findingsParityMetadataContract.js";
import type { Finding } from "../../../types/findings.js";

export interface ProtocolEnvelopePayload {
  summary?: string;
  question?: string;
  message?: string;
  decision?: ApprovalDecision;
  pass_intent?: PassIntent;
  findings_claim_state?: FindingsClaimState;
  findings_claim_source?: FindingsClaimSource;
  findings?: Finding[];
  metadata?: Record<string, unknown> & FindingsParityMetadata;
}

export interface ProtocolEnvelopeDraft {
  bubble_id: string;
  sender: ProtocolParticipant;
  recipient: ProtocolParticipant;
  type: ProtocolMessageType;
  round: number;
  payload: ProtocolEnvelopePayload;
  refs: string[];
}

export interface ProtocolEnvelope {
  id: string;
  ts: string;
  bubble_id: string;
  sender: ProtocolParticipant;
  recipient: ProtocolParticipant;
  type: ProtocolMessageType;
  round: number;
  payload: ProtocolEnvelopePayload;
  refs: string[];
}
