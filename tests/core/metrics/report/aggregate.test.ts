import { describe, expect, it } from "vitest";

import { MetricsReportAggregator } from "../../../../src/core/metrics/report/aggregate.js";
import type { MetricsReportEvent } from "../../../../src/core/metrics/report/types.js";

interface AggregatorInternals {
  pendingImplementerPassByRound: Map<string, number[]>;
  consumeReviewCycle: (
    bubbleInstanceId: string,
    round: number,
    reviewerEventTsMs: number
  ) => void;
}

function createEvent(
  input: Partial<MetricsReportEvent> & Pick<MetricsReportEvent, "eventType" | "ts">
): MetricsReportEvent {
  const { ts, eventType, ...rest } = input;
  return {
    ts,
    tsMs: new Date(ts).getTime(),
    schemaVersion: 1,
    repoPath: "/tmp/repo",
    bubbleInstanceId: "bi_agg_01",
    bubbleId: "b_agg_01",
    eventType,
    round: 1,
    actorRole: "orchestrator",
    metadata: {},
    ...rest
  };
}

describe("MetricsReportAggregator", () => {
  it("pairs review cycle with latest eligible implementer pass in round", () => {
    const aggregator = new MetricsReportAggregator();

    aggregator.observe(
      createEvent({
        ts: "2026-02-01T10:05:00.000Z",
        eventType: "bubble_passed",
        actorRole: "implementer",
        round: 1
      })
    );
    aggregator.observe(
      createEvent({
        ts: "2026-02-01T10:00:00.000Z",
        eventType: "bubble_passed",
        actorRole: "implementer",
        round: 1
      })
    );
    aggregator.observe(
      createEvent({
        ts: "2026-02-01T10:06:00.000Z",
        eventType: "bubble_passed",
        actorRole: "reviewer",
        round: 1,
        metadata: {
          pass_intent: "fix_request",
          has_findings: false,
          no_findings: true,
          p0: 0,
          p1: 0,
          p2: 0,
          p3: 0
        }
      })
    );

    const metrics = aggregator.finalize();
    expect(metrics.review_cycle_time_minutes).toEqual({
      sample_size: 1,
      median: 1,
      p90: 1
    });
  });

  it("uses last-wins tie-break for equal implementer pass timestamps", () => {
    const aggregator = new MetricsReportAggregator();
    const internals = aggregator as unknown as AggregatorInternals;
    const roundKey = "bi_agg_01:1";
    internals.pendingImplementerPassByRound.set(roundKey, [0, -0, -60_000]);

    internals.consumeReviewCycle("bi_agg_01", 1, 0);

    const remaining = internals.pendingImplementerPassByRound.get(roundKey);
    expect(remaining).toEqual([0, -60_000]);
    expect(Object.is(remaining?.[0], -0)).toBe(false);
  });

  it("counts false convergence only once per bubble instance", () => {
    const aggregator = new MetricsReportAggregator();

    aggregator.observe(
      createEvent({
        ts: "2026-02-01T10:00:00.000Z",
        eventType: "bubble_converged",
        actorRole: "reviewer",
        round: 2
      })
    );
    aggregator.observe(
      createEvent({
        ts: "2026-02-01T10:05:00.000Z",
        eventType: "bubble_rework_requested",
        actorRole: "human",
        round: 2
      })
    );
    aggregator.observe(
      createEvent({
        ts: "2026-02-01T10:10:00.000Z",
        eventType: "bubble_rework_requested",
        actorRole: "human",
        round: 2
      })
    );

    const metrics = aggregator.finalize();
    expect(metrics.false_convergence_count).toBe(1);
  });

  it("counts escaped P1 reviewer findings after convergence", () => {
    const aggregator = new MetricsReportAggregator();

    aggregator.observe(
      createEvent({
        ts: "2026-02-01T09:00:00.000Z",
        eventType: "bubble_converged",
        actorRole: "reviewer",
        round: 1
      })
    );
    aggregator.observe(
      createEvent({
        ts: "2026-02-01T09:10:00.000Z",
        eventType: "bubble_passed",
        actorRole: "reviewer",
        round: 1,
        metadata: {
          pass_intent: "fix_request",
          has_findings: true,
          no_findings: false,
          p0: 0,
          p1: 1,
          p2: 0,
          p3: 0
        }
      })
    );
    aggregator.observe(
      createEvent({
        ts: "2026-02-01T09:20:00.000Z",
        eventType: "bubble_passed",
        actorRole: "reviewer",
        round: 1,
        metadata: {
          pass_intent: "fix_request",
          has_findings: true,
          no_findings: false,
          p0: 0,
          p1: 2,
          p2: 0,
          p3: 0
        }
      })
    );

    const metrics = aggregator.finalize();
    expect(metrics.escaped_p1_after_converged).toBe(2);
  });
});
