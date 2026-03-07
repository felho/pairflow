import type {
  FindingLayer,
  FindingPriority,
  FindingTiming
} from "./findings.js";

export const agentNames = ["codex", "claude"] as const;

export type AgentName = (typeof agentNames)[number];

export const bubbleLifecycleStates = [
  "CREATED",
  "PREPARING_WORKSPACE",
  "RUNNING",
  "WAITING_HUMAN",
  "READY_FOR_APPROVAL",
  "APPROVED_FOR_COMMIT",
  "COMMITTED",
  "DONE",
  "FAILED",
  "CANCELLED"
] as const;

export type BubbleLifecycleState = (typeof bubbleLifecycleStates)[number];

export const agentRoles = ["implementer", "reviewer"] as const;

export type AgentRole = (typeof agentRoles)[number];

export const workModes = ["worktree", "clone"] as const;

export type WorkMode = (typeof workModes)[number];

export const qualityModes = ["strict"] as const;

export type QualityMode = (typeof qualityModes)[number];

export const reviewerContextModes = ["fresh", "persistent"] as const;

export type ReviewerContextMode = (typeof reviewerContextModes)[number];

export const reviewArtifactTypes = ["auto", "code", "document"] as const;

export type ReviewArtifactType = (typeof reviewArtifactTypes)[number];

export const createReviewArtifactTypes = ["code", "document"] as const;

export type CreateReviewArtifactType = (typeof createReviewArtifactTypes)[number];

export const localOverlayModes = ["symlink", "copy"] as const;

export type LocalOverlayMode = (typeof localOverlayModes)[number];

export const docContractGateModes = ["advisory"] as const;

export type DocContractGateMode = (typeof docContractGateModes)[number];

export const gateSignalLevels = ["warning", "info"] as const;

export type GateSignalLevel = (typeof gateSignalLevels)[number];

export type GateReasonCode =
  | "DOC_CONTRACT_PARSE_WARNING"
  | "REVIEW_SCHEMA_WARNING"
  | "BLOCKER_EVIDENCE_WARNING"
  | "ROUND_GATE_WARNING"
  | "ROUND_GATE_AUTODEMOTE"
  | "STATUS_GATE_SERIALIZATION_WARNING"
  | "GATE_CONFIG_PARSE_WARNING";

export const attachLaunchers = [
  "auto",
  "warp",
  "iterm2",
  "terminal",
  "ghostty",
  "copy"
] as const;

export type AttachLauncher = (typeof attachLaunchers)[number];

export interface BubbleAgentsConfig {
  implementer: AgentName;
  reviewer: AgentName;
}

export interface BubbleCommandsConfig {
  test: string;
  typecheck: string;
}

export interface BubbleNotificationsConfig {
  enabled: boolean;
  waiting_human_sound?: string;
  converged_sound?: string;
}

export interface BubbleLocalOverlayConfig {
  enabled: boolean;
  mode: LocalOverlayMode;
  entries: string[];
}

export interface BubbleDocContractGatesConfig {
  mode: DocContractGateMode;
  round_gate_applies_after: number;
  parse_warning?: string;
}

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

export interface BubbleConfig {
  id: string;
  bubble_instance_id?: string;
  repo_path: string;
  base_branch: string;
  bubble_branch: string;
  work_mode: WorkMode;
  quality_mode: QualityMode;
  review_artifact_type: ReviewArtifactType;
  reviewer_context_mode: ReviewerContextMode;
  watchdog_timeout_minutes: number;
  max_rounds: number;
  commit_requires_approval: boolean;
  accuracy_critical?: boolean;
  attach_launcher?: AttachLauncher;
  open_command?: string;
  agents: BubbleAgentsConfig;
  commands: BubbleCommandsConfig;
  notifications: BubbleNotificationsConfig;
  local_overlay?: BubbleLocalOverlayConfig;
  doc_contract_gates: BubbleDocContractGatesConfig;
}

export interface RoundRoleHistoryEntry {
  round: number;
  implementer: AgentName;
  reviewer: AgentName;
  switched_at: string;
}

export const reworkIntentStatuses = [
  "pending",
  "applied",
  "superseded"
] as const;

export type ReworkIntentStatus = (typeof reworkIntentStatuses)[number];

export interface BubbleReworkIntentRecord {
  intent_id: string;
  message: string;
  requested_by: string;
  requested_at: string;
  status: ReworkIntentStatus;
  superseded_by_intent_id?: string;
}

export interface BubbleStateSnapshot {
  bubble_id: string;
  state: BubbleLifecycleState;
  round: number;
  active_agent: AgentName | null;
  active_since: string | null;
  active_role: AgentRole | null;
  round_role_history: RoundRoleHistoryEntry[];
  last_command_at: string | null;
  pending_rework_intent?: BubbleReworkIntentRecord | null;
  rework_intent_history?: BubbleReworkIntentRecord[];
}

export function isAgentName(value: unknown): value is AgentName {
  return (
    typeof value === "string" && (agentNames as readonly string[]).includes(value)
  );
}

export function isBubbleLifecycleState(
  value: unknown
): value is BubbleLifecycleState {
  return (
    typeof value === "string" &&
    (bubbleLifecycleStates as readonly string[]).includes(value)
  );
}

export function isAgentRole(value: unknown): value is AgentRole {
  return (
    typeof value === "string" && (agentRoles as readonly string[]).includes(value)
  );
}

export function isWorkMode(value: unknown): value is WorkMode {
  return (
    typeof value === "string" && (workModes as readonly string[]).includes(value)
  );
}

export function isQualityMode(value: unknown): value is QualityMode {
  return (
    typeof value === "string" && (qualityModes as readonly string[]).includes(value)
  );
}

export function isReviewerContextMode(
  value: unknown
): value is ReviewerContextMode {
  return (
    typeof value === "string" &&
    (reviewerContextModes as readonly string[]).includes(value)
  );
}

export function isReviewArtifactType(value: unknown): value is ReviewArtifactType {
  return (
    typeof value === "string" &&
    (reviewArtifactTypes as readonly string[]).includes(value)
  );
}

export function isCreateReviewArtifactType(
  value: unknown
): value is CreateReviewArtifactType {
  return (
    typeof value === "string"
    && (createReviewArtifactTypes as readonly string[]).includes(value)
  );
}

export function isLocalOverlayMode(value: unknown): value is LocalOverlayMode {
  return (
    typeof value === "string" &&
    (localOverlayModes as readonly string[]).includes(value)
  );
}

export function isAttachLauncher(value: unknown): value is AttachLauncher {
  return (
    typeof value === "string" &&
    (attachLaunchers as readonly string[]).includes(value)
  );
}

export function isDocContractGateMode(value: unknown): value is DocContractGateMode {
  return (
    typeof value === "string"
    && (docContractGateModes as readonly string[]).includes(value)
  );
}

export function isReworkIntentStatus(value: unknown): value is ReworkIntentStatus {
  return (
    typeof value === "string" &&
    (reworkIntentStatuses as readonly string[]).includes(value)
  );
}
