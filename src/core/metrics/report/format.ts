import type { MetricsReportResult } from "./types.js";

function formatMetricNumber(value: number | null): string {
  if (value === null) {
    return "n/a";
  }
  return String(value);
}

function formatPercent(rate: number | null): string {
  if (rate === null) {
    return "n/a";
  }
  return `${(rate * 100).toFixed(1)}%`;
}

export function formatMetricsReportTable(report: MetricsReportResult): string {
  const lines: string[] = [
    "Pairflow Metrics Report",
    `Range: ${report.input.from} -> ${report.input.to}`,
    `Repo filter: ${report.input.repo_path ?? "(all repositories)"}`,
    `Scanned shards: ${report.transparency.scanned_shard_count}`,
    `Parsed known-schema events (scanned shards): ${report.transparency.parsed_event_count}`,
    `Matched events (range + repo filter): ${report.transparency.matched_event_count}`,
    `Skipped unknown schema events: ${report.transparency.skipped_unknown_schema_events}`,
    `Data-quality warnings: ${report.warnings.total}`
  ];

  if (report.transparency.scanned_shards.length > 0) {
    lines.push("Shard paths:");
    for (const shard of report.transparency.scanned_shards) {
      lines.push(`- ${shard}`);
    }
  }

  if (report.warnings.total > 0) {
    lines.push("Warning breakdown:");
    for (const [code, count] of Object.entries(report.warnings.by_code)) {
      lines.push(`- ${code}: ${count}`);
    }
  }

  lines.push(
    `Archive context: available=${report.archive_context.available ? "yes" : "no"}, considered_entries=${report.archive_context.considered_entries}, status(active/deleted/purged)=${report.archive_context.status_counts.active}/${report.archive_context.status_counts.deleted}/${report.archive_context.status_counts.purged}, missing_updated_at=${report.archive_context.missing_updated_at_count}`
  );

  lines.push("Metrics:");
  lines.push(
    `- rounds_to_converge: median=${formatMetricNumber(report.metrics.rounds_to_converge.median)}, p90=${formatMetricNumber(report.metrics.rounds_to_converge.p90)}, n=${report.metrics.rounds_to_converge.sample_size}`
  );
  lines.push(
    `- review_cycle_time_minutes: median=${formatMetricNumber(report.metrics.review_cycle_time_minutes.median)}, p90=${formatMetricNumber(report.metrics.review_cycle_time_minutes.p90)}, n=${report.metrics.review_cycle_time_minutes.sample_size}`
  );
  lines.push(
    `- rounds_with_only_p2_p3: ${report.metrics.rounds_with_only_p2_p3.count}/${report.metrics.rounds_with_only_p2_p3.total} (${formatPercent(report.metrics.rounds_with_only_p2_p3.rate)})`
  );
  lines.push(
    `- human_intervention_rate: ${report.metrics.human_intervention_rate.count}/${report.metrics.human_intervention_rate.total} (${formatPercent(report.metrics.human_intervention_rate.rate)})`
  );
  lines.push(
    `- false_convergence_count: ${report.metrics.false_convergence_count}`
  );
  lines.push(
    `- escaped_p1_after_converged: ${report.metrics.escaped_p1_after_converged}`
  );
  lines.push(
    `- meta_review_rollout.route_counts: auto_rework=${report.metrics.meta_review_rollout_signals.route_counts.auto_rework}, sticky_bypass=${report.metrics.meta_review_rollout_signals.route_counts.human_gate_sticky_bypass}, approve=${report.metrics.meta_review_rollout_signals.route_counts.human_gate_approve}, budget_exhausted=${report.metrics.meta_review_rollout_signals.route_counts.human_gate_budget_exhausted}, inconclusive=${report.metrics.meta_review_rollout_signals.route_counts.human_gate_inconclusive}, run_failed=${report.metrics.meta_review_rollout_signals.route_counts.human_gate_run_failed}, dispatch_failed=${report.metrics.meta_review_rollout_signals.route_counts.human_gate_dispatch_failed}`
  );
  lines.push(
    `- meta_review_rollout.auto_rework_dispatches: ${report.metrics.meta_review_rollout_signals.auto_rework_dispatches}`
  );
  lines.push(
    `- meta_review_rollout.human_gate_entries: ${report.metrics.meta_review_rollout_signals.human_gate_entries}`
  );
  lines.push(
    `- meta_review_rollout.rollout_blocked_events: ${report.metrics.meta_review_rollout_signals.rollout_blocked_events}`
  );
  lines.push(
    `- meta_review_rollout.pairflow_command_path_stale_count: ${report.metrics.meta_review_rollout_signals.pairflow_command_path_stale_count}`
  );
  const blockingReasonCodes = Object.entries(
    report.metrics.meta_review_rollout_signals.blocking_reason_code_counts
  );
  lines.push(
    `- meta_review_rollout.blocking_reason_code_counts: ${blockingReasonCodes.length === 0 ? "none" : blockingReasonCodes.map(([code, count]) => `${code}=${count}`).join(", ")}`
  );

  return lines.join("\n");
}

export function formatMetricsReportJson(report: MetricsReportResult): string {
  return JSON.stringify(report, null, 2);
}
