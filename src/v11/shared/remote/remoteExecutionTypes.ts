export const bubbleExecutorTypes = ["ssh"] as const;

export type BubbleExecutorType = (typeof bubbleExecutorTypes)[number];

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

export function isBubbleExecutorType(
  value: unknown
): value is BubbleExecutorType {
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
