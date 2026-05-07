import { type MetricsActorRole } from "../../../types/metrics.js";

export interface EmitBubbleLifecycleEventInput {
  repoPath: string;
  bubbleId: string;
  bubbleInstanceId: string;
  eventType: string;
  round: number | null;
  actorRole: MetricsActorRole;
  metadata: Record<string, unknown>;
  rootPath?: string;
  lockTimeoutMs?: number;
  staleLockRecoveryAfterMs?: number | null;
  now?: Date;
}

export interface EmitBubbleLifecycleEventBestEffortInput
  extends EmitBubbleLifecycleEventInput {
  reportWarning?: (message: string) => void;
}

export type EmitBubbleLifecycleEventBestEffortPort = (
  input: EmitBubbleLifecycleEventBestEffortInput
) => Promise<void>;
