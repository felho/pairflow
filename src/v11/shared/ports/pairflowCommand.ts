import type { PairflowCommandProfile } from "../../../types/bubble.js";

export type PairflowCommandPathStatus =
  | "worktree_local"
  | "external"
  | "stale"
  | "missing"
  | "unknown";

export interface PairflowCommandPathAssessment {
  status: PairflowCommandPathStatus;
  reasonCode?:
    | "PAIRFLOW_COMMAND_PATH_STALE"
    | "PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE"
    | "PAIRFLOW_COMMAND_PATH_UNRESOLVED";
  profile: PairflowCommandProfile;
  localEntrypoint: string;
  activeEntrypoint: string | null;
  localEntrypointExists: boolean;
  externalPairflowAvailable: boolean;
  pinnedCommand: string;
  entrypointConsistency?: "consistent" | "inconsistent" | "unknown";
  message: string;
}

export interface AssessPairflowCommandPathInput {
  worktreePath: string;
  profile?: PairflowCommandProfile | undefined;
  activeEntrypoint?: string | undefined;
  localEntrypointExists?: boolean | undefined;
  externalPairflowAvailable?: boolean | undefined;
}

export type AssessPairflowCommandPathPort = (
  input: AssessPairflowCommandPathInput
) => PairflowCommandPathAssessment;
