import { describe, expect, it } from "vitest";

import {
  formatMetricsReportJson,
  formatMetricsReportTable
} from "../../../../src/core/metrics/report/format.js";
import type { MetricsReportResult } from "../../../../src/core/metrics/report/types.js";

function createReportFixture(): MetricsReportResult {
  return {
    input: {
      from: "2026-02-01T00:00:00.000Z",
      to: "2026-02-28T23:59:59.999Z",
      repo_path: "/tmp/repo",
      metrics_root_path: "/tmp/metrics",
      archive_root_path: "/tmp/archive"
    },
    transparency: {
      scanned_shard_count: 1,
      scanned_shards: ["/tmp/metrics/2026/02/events-2026-02.ndjson"],
      parsed_event_count: 10,
      matched_event_count: 9,
      skipped_unknown_schema_events: 1
    },
    metrics: {
      rounds_to_converge: {
        sample_size: 2,
        median: 1.5,
        p90: 2
      },
      review_cycle_time_minutes: {
        sample_size: 3,
        median: 30,
        p90: 45
      },
      rounds_with_only_p2_p3: {
        count: 2,
        total: 4,
        rate: 0.5
      },
      human_intervention_rate: {
        count: 1,
        total: 3,
        rate: 0.3333
      },
      false_convergence_count: 1,
      escaped_p1_after_converged: 1
    },
    archive_context: {
      available: true,
      index_path: "/tmp/archive/index.json",
      total_entries: 2,
      considered_entries: 2,
      status_counts: {
        active: 0,
        deleted: 2,
        purged: 0
      },
      missing_updated_at_count: 1
    },
    warnings: {
      total: 2,
      by_code: {
        archive_index_entry_missing_updated_at: 1,
        event_invalid_json_line: 1
      }
    }
  };
}

describe("metrics report formatters", () => {
  it("renders required metrics in table output", () => {
    const rendered = formatMetricsReportTable(createReportFixture());

    expect(rendered).toContain("Pairflow Metrics Report");
    expect(rendered).toContain("Parsed known-schema events (scanned shards): 10");
    expect(rendered).toContain("Matched events (range + repo filter): 9");
    expect(rendered).toContain("rounds_to_converge");
    expect(rendered).toContain("review_cycle_time_minutes");
    expect(rendered).toContain("rounds_with_only_p2_p3");
    expect(rendered).toContain("human_intervention_rate");
    expect(rendered).toContain("false_convergence_count");
    expect(rendered).toContain("escaped_p1_after_converged");
  });

  it("renders deterministic JSON structure", () => {
    const rendered = formatMetricsReportJson(createReportFixture());
    const inputIndex = rendered.indexOf("\"input\"");
    const transparencyIndex = rendered.indexOf("\"transparency\"");
    const metricsIndex = rendered.indexOf("\"metrics\"");
    const archiveIndex = rendered.indexOf("\"archive_context\"");
    const warningsIndex = rendered.indexOf("\"warnings\"");

    expect(inputIndex).toBeGreaterThanOrEqual(0);
    expect(transparencyIndex).toBeGreaterThan(inputIndex);
    expect(metricsIndex).toBeGreaterThan(transparencyIndex);
    expect(archiveIndex).toBeGreaterThan(metricsIndex);
    expect(warningsIndex).toBeGreaterThan(archiveIndex);

    expect(JSON.parse(rendered)).toMatchObject({
      metrics: {
        rounds_to_converge: {
          sample_size: 2
        }
      }
    });
  });
});
