import type {
  AgentName,
  AgentRole,
  BubbleAgentsConfig
} from "../v11/domain/agentIdentity/agentIdentity.js";
import type {
  BubbleExecutionContext
} from "../v11/shared/state/executionContextTypes.js";
import type {
  BubbleReworkIntentRecord
} from "../v11/shared/state/reworkIntentTypes.js";
import type {
  RoundRoleHistoryEntry
} from "../v11/shared/state/roundRoleHistoryTypes.js";
import type {
  BubbleCommandsConfig
} from "../v11/shared/command/commandConfigTypes.js";
import type {
  BubbleDocContractGatesConfig
} from "../v11/shared/gates/docContractGateConfigTypes.js";
import type {
  BubbleNotificationsConfig
} from "../v11/shared/notifications/notificationConfigTypes.js";
import type {
  BubbleLocalOverlayConfig
} from "../v11/shared/workspace/localOverlayTypes.js";
import type {
  AttachLauncher
} from "../v11/shared/bubbleAttachment/attachLauncherTypes.js";
import type {
  BubbleMetaReviewSnapshotState
} from "../v11/shared/metaReview/metaReviewSnapshotTypes.js";
import type {
  BubbleReviewPolicyConfig
} from "../v11/shared/reviewPolicy/reviewPolicyTypes.js";
import type {
  BubbleExecutorConfig
} from "../v11/shared/remote/remoteExecutionTypes.js";
import type {
  BubbleValidationTargetConfig
} from "../v11/shared/validation/validationTargetConfigTypes.js";
import type {
  BubbleIdeationConfig
} from "../v11/shared/ideation/ideationConfigTypes.js";
import type {
  PairflowCommandProfile,
  QualityMode,
  ReviewArtifactType,
  ReviewerContextMode,
  WorkMode
} from "../v11/shared/config/bubbleConfigVocabulary.js";

export const bubbleLifecycleStates = [
  "CREATED",
  "PREPARING_WORKSPACE",
  "RUNNING",
  "WAITING_HUMAN",
  "READY_FOR_HUMAN_APPROVAL",
  "APPROVED_FOR_COMMIT",
  "COMMITTED",
  "DONE",
  "FAILED",
  "CANCELLED"
] as const;

export type BubbleLifecycleState = (typeof bubbleLifecycleStates)[number];

export interface BubbleRemoteStateCache {
  lastCheckedAt: string;
  state: BubbleLifecycleState;
  round: number;
  maxRounds: number;
  metaReview?: {
    consecutiveCleanRuns: number;
  };
  implementerStatus?: string;
  reviewerStatus?: string;
}

export interface BubbleConfig {
  id: string;
  bubble_instance_id?: string;
  repo_path: string;
  base_branch: string;
  bubble_branch: string;
  work_mode: WorkMode;
  quality_mode: QualityMode;
  review_artifact_type: ReviewArtifactType;
  pairflow_command_profile: PairflowCommandProfile;
  reviewer_context_mode: ReviewerContextMode;
  watchdog_timeout_minutes: number;
  max_rounds: number;
  severity_gate_round: number;
  commit_requires_approval: boolean;
  accuracy_critical?: boolean;
  attach_launcher?: AttachLauncher;
  open_command?: string;
  open_remote_command?: string;
  review_policy?: BubbleReviewPolicyConfig;
  validation_target?: BubbleValidationTargetConfig;
  agents: BubbleAgentsConfig;
  commands: BubbleCommandsConfig;
  notifications: BubbleNotificationsConfig;
  local_overlay?: BubbleLocalOverlayConfig;
  doc_contract_gates: BubbleDocContractGatesConfig;
  ideation?: BubbleIdeationConfig;
  executor?: BubbleExecutorConfig;
}

export interface BubbleStateSnapshot {
  bubble_id: string;
  state: BubbleLifecycleState;
  round: number;
  active_agent: AgentName | null;
  active_since: string | null;
  active_role: AgentRole | null;
  execution_context?: BubbleExecutionContext | null;
  round_role_history: RoundRoleHistoryEntry[];
  last_command_at: string | null;
  pending_rework_intent?: BubbleReworkIntentRecord | null;
  rework_intent_history?: BubbleReworkIntentRecord[];
  meta_review?: BubbleMetaReviewSnapshotState;
}

export function isBubbleLifecycleState(
  value: unknown
): value is BubbleLifecycleState {
  return (
    typeof value === "string" &&
    (bubbleLifecycleStates as readonly string[]).includes(value)
  );
}
