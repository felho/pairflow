import type {
  BubbleFailingGate,
  BubbleRoundGateState,
  BubbleSpecLockState
} from "../../../types/bubble.js";
import type { GateFindingEvaluation } from "./docContractReviewerGateEvaluation.js";

export const docContractGateArtifactSchemaVersion = 1 as const;

export interface DocContractGateArtifact {
  schema_version: typeof docContractGateArtifactSchemaVersion;
  updated_at: string;
  task_warnings: BubbleFailingGate[];
  config_warnings: BubbleFailingGate[];
  review_warnings: BubbleFailingGate[];
  finding_evaluations: GateFindingEvaluation[];
  round_gate_state: BubbleRoundGateState;
  spec_lock_state: BubbleSpecLockState;
}

export class DocContractGateArtifactError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "DocContractGateArtifactError";
  }
}
