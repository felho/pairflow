import type { MetricsReportEvent, MetricsReportMetrics } from "./types.js";

interface BubbleAggregateState {
  hasHumanIntervention: boolean;
  firstConvergedAtMs: number | null;
  falseConvergenceCounted: boolean;
}

interface ReviewerFindingMetadata {
  hasFindings: boolean;
  noFindings: boolean;
  p0: number;
  p1: number;
  p2: number;
  p3: number;
}

function roundTo(value: number, decimals: number): number {
  const scale = 10 ** decimals;
  return Math.round(value * scale) / scale;
}

function summarizeQuantiles(values: number[]): {
  sample_size: number;
  median: number | null;
  p90: number | null;
} {
  if (values.length === 0) {
    return {
      sample_size: 0,
      median: null,
      p90: null
    };
  }

  const sorted = [...values].sort((left, right) => left - right);
  const medianIndex = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? ((sorted[medianIndex - 1] ?? 0) + (sorted[medianIndex] ?? 0)) / 2
      : (sorted[medianIndex] ?? 0);
  const p90Rank = Math.max(1, Math.ceil(sorted.length * 0.9));
  const p90 = sorted[p90Rank - 1] ?? null;

  return {
    sample_size: sorted.length,
    median: roundTo(median, 2),
    p90: p90 === null ? null : roundTo(p90, 2)
  };
}

function asNonNegativeInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return null;
  }
  return value;
}

function parseReviewerFindingMetadata(
  metadata: Record<string, unknown>
): ReviewerFindingMetadata | null {
  if (
    typeof metadata.has_findings !== "boolean" ||
    typeof metadata.no_findings !== "boolean"
  ) {
    return null;
  }

  const p0 = asNonNegativeInteger(metadata.p0);
  const p1 = asNonNegativeInteger(metadata.p1);
  const p2 = asNonNegativeInteger(metadata.p2);
  const p3 = asNonNegativeInteger(metadata.p3);
  if (p0 === null || p1 === null || p2 === null || p3 === null) {
    return null;
  }

  return {
    hasFindings: metadata.has_findings,
    noFindings: metadata.no_findings,
    p0,
    p1,
    p2,
    p3
  };
}

function rate(count: number, total: number): number | null {
  if (total === 0) {
    return null;
  }
  return roundTo(count / total, 4);
}

function buildRoundKey(bubbleInstanceId: string, round: number): string {
  return `${bubbleInstanceId}:${String(round)}`;
}

function isHumanInterventionEvent(event: MetricsReportEvent): boolean {
  if (event.actorRole === "human") {
    return true;
  }

  return event.eventType === "bubble_asked_human";
}

export class MetricsReportAggregator {
  private readonly bubbleState = new Map<string, BubbleAggregateState>();

  private readonly pendingImplementerPassByRound = new Map<string, number[]>();

  private readonly roundsToConverge: number[] = [];

  private readonly reviewCycleMinutes: number[] = [];

  private reviewerRoundsTotal = 0;

  private reviewerRoundsOnlyP2P3 = 0;

  private falseConvergenceCount = 0;

  private escapedP1AfterConverged = 0;

  private getOrCreateBubbleState(
    bubbleInstanceId: string
  ): BubbleAggregateState {
    const existing = this.bubbleState.get(bubbleInstanceId);
    if (existing !== undefined) {
      return existing;
    }

    const created: BubbleAggregateState = {
      hasHumanIntervention: false,
      firstConvergedAtMs: null,
      falseConvergenceCounted: false
    };
    this.bubbleState.set(bubbleInstanceId, created);
    return created;
  }

  private consumeReviewCycle(
    bubbleInstanceId: string,
    round: number,
    reviewerEventTsMs: number
  ): void {
    const roundKey = buildRoundKey(bubbleInstanceId, round);
    const pending = this.pendingImplementerPassByRound.get(roundKey);
    if (pending === undefined || pending.length === 0) {
      return;
    }

    let eligibleIndex = -1;
    let eligibleTimestamp = Number.NEGATIVE_INFINITY;
    for (let index = 0; index < pending.length; index += 1) {
      const candidate = pending[index];
      if (
        candidate !== undefined &&
        candidate <= reviewerEventTsMs &&
        candidate >= eligibleTimestamp
      ) {
        eligibleIndex = index;
        eligibleTimestamp = candidate;
      }
    }
    if (eligibleIndex < 0) {
      return;
    }

    const startTsMs = pending[eligibleIndex];
    if (startTsMs === undefined) {
      return;
    }

    pending.splice(eligibleIndex, 1);
    const deltaMinutes = (reviewerEventTsMs - startTsMs) / 60_000;
    if (deltaMinutes >= 0) {
      this.reviewCycleMinutes.push(deltaMinutes);
    }
  }

  public observe(event: MetricsReportEvent): void {
    const bubble = this.getOrCreateBubbleState(event.bubbleInstanceId);
    if (isHumanInterventionEvent(event)) {
      bubble.hasHumanIntervention = true;
    }

    if (
      event.eventType === "bubble_passed" &&
      event.actorRole === "implementer" &&
      event.round !== null
    ) {
      const roundKey = buildRoundKey(event.bubbleInstanceId, event.round);
      const existing = this.pendingImplementerPassByRound.get(roundKey) ?? [];
      existing.push(event.tsMs);
      this.pendingImplementerPassByRound.set(roundKey, existing);
      return;
    }

    if (event.eventType === "bubble_converged") {
      if (event.round !== null) {
        this.roundsToConverge.push(event.round);
        this.consumeReviewCycle(event.bubbleInstanceId, event.round, event.tsMs);
      }
      if (
        bubble.firstConvergedAtMs === null ||
        event.tsMs < bubble.firstConvergedAtMs
      ) {
        bubble.firstConvergedAtMs = event.tsMs;
      }
      return;
    }

    if (
      event.eventType === "bubble_passed" &&
      event.actorRole === "reviewer"
    ) {
      if (event.round !== null) {
        this.consumeReviewCycle(event.bubbleInstanceId, event.round, event.tsMs);
      }

      const parsedFindings = parseReviewerFindingMetadata(event.metadata);
      if (parsedFindings !== null) {
        this.reviewerRoundsTotal += 1;
        if (
          parsedFindings.hasFindings &&
          parsedFindings.p0 === 0 &&
          parsedFindings.p1 === 0 &&
          parsedFindings.p2 + parsedFindings.p3 > 0
        ) {
          this.reviewerRoundsOnlyP2P3 += 1;
        }

        if (
          bubble.firstConvergedAtMs !== null &&
          event.tsMs > bubble.firstConvergedAtMs &&
          parsedFindings.p1 > 0
        ) {
          this.escapedP1AfterConverged += 1;
        }
      }
      return;
    }

    if (
      event.eventType === "bubble_rework_requested" &&
      bubble.firstConvergedAtMs !== null &&
      event.tsMs > bubble.firstConvergedAtMs &&
      !bubble.falseConvergenceCounted
    ) {
      bubble.falseConvergenceCounted = true;
      this.falseConvergenceCount += 1;
    }
  }

  public finalize(): MetricsReportMetrics {
    // Denominator semantics:
    // human_intervention_rate is computed over all bubble instances observed
    // in the parsed event stream for the report window, including minimal
    // "stub" traces (for example only bubble_created).
    const totalBubbles = this.bubbleState.size;
    const bubblesWithHumanIntervention = [...this.bubbleState.values()].filter(
      (value) => value.hasHumanIntervention
    ).length;

    return {
      rounds_to_converge: summarizeQuantiles(this.roundsToConverge),
      review_cycle_time_minutes: summarizeQuantiles(this.reviewCycleMinutes),
      rounds_with_only_p2_p3: {
        count: this.reviewerRoundsOnlyP2P3,
        total: this.reviewerRoundsTotal,
        rate: rate(this.reviewerRoundsOnlyP2P3, this.reviewerRoundsTotal)
      },
      human_intervention_rate: {
        count: bubblesWithHumanIntervention,
        total: totalBubbles,
        rate: rate(bubblesWithHumanIntervention, totalBubbles)
      },
      false_convergence_count: this.falseConvergenceCount,
      escaped_p1_after_converged: this.escapedP1AfterConverged
    };
  }
}
