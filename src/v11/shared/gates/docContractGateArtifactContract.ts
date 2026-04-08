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

export interface DocContractGateArtifactErrorContext {
  source: "artifact_read" | "artifact_normalization";
  reason: "invalid_json" | "invalid_shape";
  artifactPath?: string | undefined;
}

export class DocContractGateArtifactError extends Error {
  public readonly context: DocContractGateArtifactErrorContext | undefined;

  public constructor(
    input:
      | string
      | {
        message: string;
        context?: DocContractGateArtifactErrorContext | undefined;
      }
  ) {
    const normalized =
      typeof input === "string" ? { message: input, context: undefined } : input;
    super(normalized.message);
    this.name = "DocContractGateArtifactError";
    this.context = normalized.context;
  }
}
