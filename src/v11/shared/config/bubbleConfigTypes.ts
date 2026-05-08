import type {
  BubbleAgentsConfig
} from "../../domain/agentIdentity/agentIdentity.js";
import type {
  AttachLauncher
} from "../bubbleAttachment/attachLauncherTypes.js";
import type {
  BubbleCommandsConfig
} from "../command/commandConfigTypes.js";
import type {
  BubbleDocContractGatesConfig
} from "../gates/docContractGateConfigTypes.js";
import type {
  BubbleIdeationConfig
} from "../ideation/ideationConfigTypes.js";
import type {
  BubbleNotificationsConfig
} from "../notifications/notificationConfigTypes.js";
import type {
  BubbleReviewPolicyConfig
} from "../reviewPolicy/reviewPolicyTypes.js";
import type {
  BubbleExecutorConfig
} from "../remote/remoteExecutionTypes.js";
import type {
  BubbleValidationTargetConfig
} from "../validation/validationTargetConfigTypes.js";
import type {
  BubbleLocalOverlayConfig
} from "../workspace/localOverlayTypes.js";
import type {
  PairflowCommandProfile,
  QualityMode,
  ReviewArtifactType,
  ReviewerContextMode,
  WorkMode
} from "./bubbleConfigVocabulary.js";

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
