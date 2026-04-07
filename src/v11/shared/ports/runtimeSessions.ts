export interface RuntimeMetaReviewerPaneBinding {
  role: "meta-reviewer";
  paneIndex: number;
  active: boolean;
  updatedAt: string;
}

export interface RuntimeSessionRecord {
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
  tmuxSessionName: string;
  updatedAt: string;
  metaReviewerPane?: RuntimeMetaReviewerPaneBinding;
}

export type RuntimeSessionsRegistry = Record<string, RuntimeSessionRecord>;

export interface ReadRuntimeSessionsOptions {
  allowMissing?: boolean;
}

export interface ClaimRuntimeSessionInput {
  sessionsPath: string;
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
  tmuxSessionName: string;
  now?: Date;
  lockTimeoutMs?: number;
}

export interface ClaimRuntimeSessionResult {
  claimed: boolean;
  record: RuntimeSessionRecord;
}

export interface RemoveRuntimeSessionInput {
  sessionsPath: string;
  bubbleId: string;
  lockTimeoutMs?: number;
}

export interface RemoveRuntimeSessionsInput {
  sessionsPath: string;
  bubbleIds: string[];
  lockTimeoutMs?: number;
}

export interface RemoveRuntimeSessionsResult {
  removedBubbleIds: string[];
  missingBubbleIds: string[];
}

export type ReadRuntimeSessionsRegistryPort = (
  sessionsPath: string,
  options?: ReadRuntimeSessionsOptions
) => Promise<RuntimeSessionsRegistry>;

export type ClaimRuntimeSessionPort = (
  input: ClaimRuntimeSessionInput
) => Promise<ClaimRuntimeSessionResult>;

export type RemoveRuntimeSessionPort = (
  input: RemoveRuntimeSessionInput
) => Promise<boolean>;

export type RemoveRuntimeSessionsPort = (
  input: RemoveRuntimeSessionsInput
) => Promise<RemoveRuntimeSessionsResult>;
