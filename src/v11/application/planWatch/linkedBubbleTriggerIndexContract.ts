export type LinkedBubbleRole = "document" | "implementation";

export type LinkedBubbleApprovalReadyState =
  | "READY_FOR_HUMAN_APPROVAL"
  | "READY_FOR_APPROVAL";

export type LinkedBubbleTriggerDiagnosticScope = "plan" | "task" | "bubble";

export type LinkedBubbleTriggerDiagnosticCode =
  | "PLAN_UNREADABLE"
  | "PLAN_FRONTMATTER_INVALID"
  | "PLAN_TRACKER_INVALID"
  | "TASK_PATH_MISSING"
  | "TASK_UNREADABLE"
  | "TASK_FRONTMATTER_INVALID"
  | "TASK_ID_MISMATCH"
  | "BUBBLE_LINKAGE_MISSING"
  | "BUBBLE_STATUS_UNAVAILABLE"
  | "BUBBLE_STATUS_STALE"
  | "BUBBLE_STATUS_UNSUPPORTED";

export type LinkedBubbleTriggerDiagnosticSeverity = "info" | "warning" | "error";

export interface LinkedBubbleTriggerDiagnostic {
  kind: "linked_bubble_trigger_diagnostic";
  scope: LinkedBubbleTriggerDiagnosticScope;
  code: LinkedBubbleTriggerDiagnosticCode;
  severity: LinkedBubbleTriggerDiagnosticSeverity;
  message: string;
  taskId?: string | undefined;
  taskPath?: string | undefined;
  bubbleId?: string | undefined;
  bubbleRole?: LinkedBubbleRole | undefined;
}

export interface LinkedBubbleTriggerIndexInput {
  repoPath: string;
  planPath: string;
  now?: Date | undefined;
}

export interface LinkedBubbleTriggerCandidate {
  planPath: string;
  taskId: string;
  taskPath: string;
  bubbleId: string;
  bubbleRole: LinkedBubbleRole;
  observedState: LinkedBubbleApprovalReadyState;
  observedAt?: string | undefined;
  statusRef?: string | undefined;
  statusMetadata?: Readonly<Record<string, unknown>> | undefined;
}

export interface LinkedBubbleStatusSnapshot {
  planPath: string;
  taskId: string;
  taskPath: string;
  bubbleId: string;
  bubbleRole: LinkedBubbleRole;
  state: string;
  observedAt?: string | undefined;
  current: boolean;
  statusRef?: string | undefined;
  metadata?: Readonly<Record<string, unknown>> | undefined;
}

export interface LinkedBubbleTriggerIndexResult {
  planPath: string;
  candidates: readonly LinkedBubbleTriggerCandidate[];
  linkedBubbles: readonly LinkedBubbleStatusSnapshot[];
  diagnostics: readonly LinkedBubbleTriggerDiagnostic[];
}

export interface LinkedBubbleStatusPortInput {
  repoPath: string;
  bubbleId: string;
  now?: Date | undefined;
}

export interface LinkedBubbleStatusPortSnapshot {
  state: string;
  observedAt?: string | undefined;
  current: boolean;
  statusRef?: string | undefined;
  metadata?: Readonly<Record<string, unknown>> | undefined;
}

export type LinkedBubbleStatusPort = (
  input: LinkedBubbleStatusPortInput
) => Promise<LinkedBubbleStatusPortSnapshot | LinkedBubbleTriggerDiagnostic>;

export interface LinkedBubbleTriggerIndexDependencies {
  readFile: (path: string) => Promise<string>;
  getBubbleStatus: LinkedBubbleStatusPort;
}
