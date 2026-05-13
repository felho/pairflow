import type {
  FindingLayer,
  FindingPriority,
  FindingTiming
} from "../../../contracts/kernel/findings.js";

export const gateSignalLevels = ["warning", "info"] as const;

export type GateSignalLevel = (typeof gateSignalLevels)[number];

export type GateReasonCode =
  | "DOC_CONTRACT_PARSE_WARNING"
  | "REVIEW_SCHEMA_WARNING"
  | "BLOCKER_EVIDENCE_WARNING"
  | "ROUND_GATE_WARNING"
  | "ROUND_GATE_AUTODEMOTE"
  | "STATUS_GATE_SERIALIZATION_WARNING"
  | "GATE_CONFIG_PARSE_WARNING"
  | "META_REVIEW_APPROVE_VALIDATION_FAILED"
  | "META_REVIEW_APPROVE_THRESHOLD_BACKSTOP";

export interface BubbleFailingGate {
  gate_id: string;
  reason_code: GateReasonCode | (string & {});
  message: string;
  priority: FindingPriority;
  timing: FindingTiming;
  layer?: FindingLayer;
  evidence_refs?: string[];
  signal_level?: GateSignalLevel;
  effective_priority?: FindingPriority;
}

export interface BubbleSpecLockState {
  state: "LOCKED" | "IMPLEMENTABLE";
  open_blocker_count: number;
  open_required_now_count: number;
}

export interface BubbleRoundGateState {
  applies: boolean;
  violated: boolean;
  round: number;
  reason_code?: string;
}
