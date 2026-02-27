export type MetricsReportFormat = "table" | "json";

export interface MetricsReportInput {
  from: Date;
  to: Date;
  repoPath?: string;
  metricsRootPath?: string;
  archiveRootPath?: string;
}

export interface MetricsReportEvent {
  ts: string;
  tsMs: number;
  schemaVersion: number;
  repoPath: string;
  bubbleInstanceId: string;
  bubbleId: string;
  eventType: string;
  round: number | null;
  actorRole: "implementer" | "reviewer" | "human" | "orchestrator";
  metadata: Record<string, unknown>;
}

export interface MetricsQuantileSummary {
  sample_size: number;
  median: number | null;
  p90: number | null;
}

export interface MetricsRateSummary {
  count: number;
  total: number;
  rate: number | null;
}

export interface MetricsReportMetrics {
  rounds_to_converge: MetricsQuantileSummary;
  review_cycle_time_minutes: MetricsQuantileSummary;
  rounds_with_only_p2_p3: MetricsRateSummary;
  human_intervention_rate: MetricsRateSummary;
  false_convergence_count: number;
  escaped_p1_after_converged: number;
}

export interface MetricsReportArchiveContext {
  available: boolean;
  index_path: string;
  total_entries: number;
  considered_entries: number;
  status_counts: {
    active: number;
    deleted: number;
    purged: number;
  };
  missing_updated_at_count: number;
}

export interface MetricsReportTransparency {
  scanned_shard_count: number;
  scanned_shards: string[];
  parsed_event_count: number;
  matched_event_count: number;
  skipped_unknown_schema_events: number;
}

export interface MetricsReportWarningSummary {
  total: number;
  by_code: Record<string, number>;
}

export interface MetricsReportResult {
  input: {
    from: string;
    to: string;
    repo_path: string | null;
    metrics_root_path: string;
    archive_root_path: string;
  };
  transparency: MetricsReportTransparency;
  metrics: MetricsReportMetrics;
  archive_context: MetricsReportArchiveContext;
  warnings: MetricsReportWarningSummary;
}

export type MetricsReportWarningCounts = Record<string, number>;
