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
  "READY_FOR_HUMAN_APPROVAL",
  "APPROVED_FOR_COMMIT",
  "COMMITTED",
  "DONE",
  "FAILED",
  "CANCELLED"
] as const;

export type BubbleLifecycleState = (typeof bubbleLifecycleStates)[number];

export const agentRoles = ["implementer", "reviewer", "meta_reviewer"] as const;

export type AgentRole = (typeof agentRoles)[number];

export const workModes = ["worktree", "clone"] as const;

export type WorkMode = (typeof workModes)[number];

export const qualityModes = ["strict"] as const;

export type QualityMode = (typeof qualityModes)[number];

export const reviewerContextModes = ["fresh", "persistent"] as const;

export type ReviewerContextMode = (typeof reviewerContextModes)[number];

export const pairflowCommandProfiles = ["external", "self_host"] as const;

export type PairflowCommandProfile = (typeof pairflowCommandProfiles)[number];

export const bubbleExecutorTypes = ["ssh"] as const;

export type BubbleExecutorType = (typeof bubbleExecutorTypes)[number];

export const reviewArtifactTypes = ["code", "document"] as const;

export type ReviewArtifactType = (typeof reviewArtifactTypes)[number];

export const createReviewArtifactTypes = ["code", "document"] as const;

export type CreateReviewArtifactType = (typeof createReviewArtifactTypes)[number];

export const bubbleReviewLoopModes = ["full", "meta_only"] as const;

export type BubbleReviewLoopMode = (typeof bubbleReviewLoopModes)[number];

export const bubbleReviewAutoReworkSeverities = ["P1", "P2", "P3"] as const;

export type BubbleReviewAutoReworkSeverity =
  (typeof bubbleReviewAutoReworkSeverities)[number];

export const bubbleReviewSupportStatuses = ["enabled", "guarded"] as const;

export type BubbleReviewSupportStatus = (typeof bubbleReviewSupportStatuses)[number];

export const localOverlayModes = ["symlink", "copy"] as const;

export type LocalOverlayMode = (typeof localOverlayModes)[number];

export const gateSignalLevels = ["warning", "info"] as const;

export type GateSignalLevel = (typeof gateSignalLevels)[number];

export const DEFAULT_META_REVIEW_AUTO_REWORK_LIMIT = 10;

export const metaReviewRunStatuses = [
  "success",
  "error",
  "inconclusive"
] as const;

export type MetaReviewRunStatus = (typeof metaReviewRunStatuses)[number];

export const metaReviewRecommendations = [
  "rework",
  "approve",
  "inconclusive"
] as const;

export type MetaReviewRecommendation = (typeof metaReviewRecommendations)[number];

export const bubbleExecutionContextAwaitedOutputTypes = [
  "pass_result",
  "meta_review_result"
] as const;

export type BubbleExecutionContextAwaitedOutputType =
  (typeof bubbleExecutionContextAwaitedOutputTypes)[number];

export const metaReviewExecutionContextAwaitedOutputTypes = [
  "meta_review_result"
] as const;

export type MetaReviewExecutionContextAwaitedOutputType =
  (typeof metaReviewExecutionContextAwaitedOutputTypes)[number];

export const metaReviewRuntimeDeliveryStatuses = [
  "confirmed",
  "uncertain",
  "failed"
] as const;

export type MetaReviewRuntimeDeliveryStatus =
  (typeof metaReviewRuntimeDeliveryStatuses)[number];

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
  meta_reviewer: AgentName;
}

export function resolveConfiguredAgentForRole(input: {
  agents: BubbleAgentsConfig;
  role: AgentRole;
}): AgentName {
  switch (input.role) {
    case "implementer":
      return input.agents.implementer;
    case "reviewer":
      return input.agents.reviewer;
    case "meta_reviewer":
      return input.agents.meta_reviewer;
  }
}

export function resolveUniquelyConfiguredRoleForAgent(input: {
  agents: BubbleAgentsConfig;
  agent: AgentName;
  roles?: readonly AgentRole[];
}): AgentRole | undefined {
  const roles = input.roles ?? agentRoles;
  let matchedRole: AgentRole | undefined;
  for (const role of roles) {
    if (
      resolveConfiguredAgentForRole({
        agents: input.agents,
        role
      }) !== input.agent
    ) {
      continue;
    }
    if (matchedRole !== undefined) {
      return undefined;
    }
    matchedRole = role;
  }
  return matchedRole;
}

export interface BubbleCommandsConfig {
  bootstrap?: string;
  lint?: string;
  test: string;
  typecheck: string;
  validation_required?: string[];
  validation_required_explicit?: boolean;
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
  round_gate_applies_after: number;
  parse_warning?: string;
}

export interface BubbleReviewPolicyConfig {
  review_loop_mode: BubbleReviewLoopMode;
  meta_review_auto_rework_min_severity: BubbleReviewAutoReworkSeverity;
}

export interface BubbleReviewPolicyRuntimeView {
  requested_loop_mode: BubbleReviewLoopMode;
  effective_loop_mode: BubbleReviewLoopMode;
  support_status: BubbleReviewSupportStatus;
  meta_review_auto_rework_min_severity: BubbleReviewAutoReworkSeverity;
  blocked_reason_code?: string;
  blocked_prerequisites?: string[];
  provenance_note?: string;
}

export interface PairflowRemoteHostConfig {
  host: string;
  repo_base: string;
  user?: string;
  pairflow_command?: string;
  pairflow_sync_command?: string;
  default_port_forwards?: number[];
}

export interface BubbleExecutorConfig {
  type: BubbleExecutorType;
  remote: string;
}

export const bubbleRemotePointerKinds = [
  "created",
  "started"
] as const;

export type BubbleRemotePointerKind = (typeof bubbleRemotePointerKinds)[number];

interface BubbleRemotePointerBase {
  host: string;
  user?: string;
  portForwards?: number[];
}

export interface BubbleRemotePointerCreated extends BubbleRemotePointerBase {
  kind: "created";
}

export interface BubbleRemotePointerStarted extends BubbleRemotePointerBase {
  kind: "started";
  instanceId: string;
  remoteClonePath: string;
  tmuxSession: string;
  startedAt: string;
}

export type BubbleRemotePointer =
  | BubbleRemotePointerCreated
  | BubbleRemotePointerStarted;

export interface BubbleRemoteStateCache {
  lastCheckedAt: string;
  state: BubbleLifecycleState;
  round: number;
  maxRounds: number;
  implementerStatus?: string;
  reviewerStatus?: string;
}

export interface BubbleIdeationConfig {
  mode: boolean;
  task_pending: boolean;
  started_at?: string;
  kicked_off_at?: string;
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
  agents: BubbleAgentsConfig;
  commands: BubbleCommandsConfig;
  notifications: BubbleNotificationsConfig;
  local_overlay?: BubbleLocalOverlayConfig;
  doc_contract_gates: BubbleDocContractGatesConfig;
  ideation?: BubbleIdeationConfig;
  executor?: BubbleExecutorConfig;
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
  refs?: string[];
  requested_by: string;
  requested_at: string;
  status: ReworkIntentStatus;
  superseded_by_intent_id?: string;
}

export interface BubbleMetaReviewExecutionContext {
  handoff_id: string;
  execution_id: string;
  round: number;
  awaited_output_type: MetaReviewExecutionContextAwaitedOutputType;
  started_at: string;
  deadline_at: string;
  attempt: number;
}

export interface BubbleExecutionContext {
  active_role: AgentRole;
  awaited_output_type: BubbleExecutionContextAwaitedOutputType;
  handoff_id: string;
  execution_id: string;
  round: number;
  started_at: string;
  deadline_at: string;
  attempt: number;
}

export interface BubbleMetaReviewRuntimeDeliveryState {
  // Observability-only diagnostic block. It must never become canonical
  // submit/approval authority and is only active when same-authority
  // correlation fields match the current meta-review execution context.
  status: MetaReviewRuntimeDeliveryStatus;
  reason_code: string | null;
  message: string;
  observed_at: string;
  observed_for_handoff_id: string | null;
  observed_for_round: number | null;
}

export interface BubbleMetaReviewSnapshotState {
  execution_context?: BubbleMetaReviewExecutionContext | null;
  runtime_delivery?: BubbleMetaReviewRuntimeDeliveryState | null;
  auto_rework_count: number;
  auto_rework_limit: number;
  sticky_human_gate: boolean;
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

export function isBubbleExecutorType(value: unknown): value is BubbleExecutorType {
  return (
    typeof value === "string" &&
    (bubbleExecutorTypes as readonly string[]).includes(value)
  );
}

export function isBubbleRemotePointerKind(
  value: unknown
): value is BubbleRemotePointerKind {
  return (
    typeof value === "string" &&
    (bubbleRemotePointerKinds as readonly string[]).includes(value)
  );
}

export function isBubbleRemotePointerCreated(
  value: unknown
): value is BubbleRemotePointerCreated {
  return (
    typeof value === "object"
    && value !== null
    && "kind" in value
    && value.kind === "created"
  );
}

export function isBubbleRemotePointerStarted(
  value: unknown
): value is BubbleRemotePointerStarted {
  return (
    typeof value === "object"
    && value !== null
    && "kind" in value
    && value.kind === "started"
  );
}

export function isPairflowCommandProfile(
  value: unknown
): value is PairflowCommandProfile {
  return (
    typeof value === "string"
    && (pairflowCommandProfiles as readonly string[]).includes(value)
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

export function isBubbleReviewLoopMode(
  value: unknown
): value is BubbleReviewLoopMode {
  return (
    typeof value === "string"
    && (bubbleReviewLoopModes as readonly string[]).includes(value)
  );
}

export function isBubbleReviewAutoReworkSeverity(
  value: unknown
): value is BubbleReviewAutoReworkSeverity {
  return (
    typeof value === "string"
    && (bubbleReviewAutoReworkSeverities as readonly string[]).includes(value)
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

export function isReworkIntentStatus(value: unknown): value is ReworkIntentStatus {
  return (
    typeof value === "string" &&
    (reworkIntentStatuses as readonly string[]).includes(value)
  );
}

export function isMetaReviewRunStatus(
  value: unknown
): value is MetaReviewRunStatus {
  return (
    typeof value === "string" &&
    (metaReviewRunStatuses as readonly string[]).includes(value)
  );
}

export function isMetaReviewRecommendation(
  value: unknown
): value is MetaReviewRecommendation {
  return (
    typeof value === "string" &&
    (metaReviewRecommendations as readonly string[]).includes(value)
  );
}

export function isMetaReviewRuntimeDeliveryStatus(
  value: unknown
): value is MetaReviewRuntimeDeliveryStatus {
  return (
    typeof value === "string" &&
    (metaReviewRuntimeDeliveryStatuses as readonly string[]).includes(value)
  );
}

export function isMetaReviewExecutionContextAwaitedOutputType(
  value: unknown
): value is MetaReviewExecutionContextAwaitedOutputType {
  return (
    typeof value === "string" &&
    (
      metaReviewExecutionContextAwaitedOutputTypes as readonly string[]
    ).includes(value)
  );
}

export function isBubbleExecutionContextAwaitedOutputType(
  value: unknown
): value is BubbleExecutionContextAwaitedOutputType {
  return (
    typeof value === "string"
    && (
      bubbleExecutionContextAwaitedOutputTypes as readonly string[]
    ).includes(value)
  );
}
