import type { BubbleFailingGate } from "../../../types/bubble.js";
import type {
  FindingLayer,
  FindingPriority,
  FindingTiming
} from "../../../types/findings.js";

interface CreateGateWarningInput {
  gateId: string;
  reasonCode: BubbleFailingGate["reason_code"];
  message: string;
  priority?: FindingPriority | undefined;
  timing?: FindingTiming | undefined;
  layer?: FindingLayer | undefined;
  evidenceRefs?: string[] | undefined;
  effectivePriority?: FindingPriority | undefined;
}

export function createGateWarning(
  input: CreateGateWarningInput
): BubbleFailingGate {
  const warning: BubbleFailingGate = {
    gate_id: input.gateId,
    reason_code: input.reasonCode,
    message: input.message,
    priority: input.priority ?? "P2",
    timing: input.timing ?? "later-hardening",
    signal_level: "warning"
  };
  if (input.layer !== undefined) {
    warning.layer = input.layer;
  }
  if (input.evidenceRefs !== undefined && input.evidenceRefs.length > 0) {
    warning.evidence_refs = input.evidenceRefs;
  }
  if (input.effectivePriority !== undefined) {
    warning.effective_priority = input.effectivePriority;
  }
  return warning;
}
