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

export interface BubbleConfig {
  id: string;
  repo_path: string;
  base_branch: string;
  bubble_branch: string;
  work_mode: WorkMode;
  quality_mode: QualityMode;
  reviewer_context_mode: ReviewerContextMode;
  watchdog_timeout_minutes: number;
  max_rounds: number;
  commit_requires_approval: boolean;
  open_command?: string;
  agents: BubbleAgentsConfig;
  commands: BubbleCommandsConfig;
  notifications: BubbleNotificationsConfig;
}

export interface RoundRoleHistoryEntry {
  round: number;
  implementer: AgentName;
  reviewer: AgentName;
  switched_at: string;
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
