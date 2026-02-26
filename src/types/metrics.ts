export const metricsSchemaVersion = 1 as const;

export const metricsActorRoles = [
  "implementer",
  "reviewer",
  "human",
  "orchestrator"
] as const;

export type MetricsActorRole = (typeof metricsActorRoles)[number];

export interface PairflowMetricsEvent {
  ts: string;
  schema_version: typeof metricsSchemaVersion;
  repo_path: string;
  bubble_instance_id: string;
  bubble_id: string;
  event_type: string;
  round: number | null;
  actor_role: MetricsActorRole;
  metadata: Record<string, unknown>;
}
