import type {
  MetricsReportEvent,
  MetricsReportMetrics
} from "./types.js";
import {
  asMetaReviewRouteKey,
  buildRoundKey,
  createEmptyMetaReviewRouteCounts,
  incrementReasonCodeCounts,
  isHumanInterventionEvent,
  parseJsonStringArray,
  parseReviewerFindingMetadata,
  rate,
  summarizeQuantiles
} from "./aggregateSupport.js";

interface BubbleAggregateState {
  hasHumanIntervention: boolean;
  firstConvergedAtMs: number | null;
  falseConvergenceCounted: boolean;
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

  private readonly metaReviewRouteCounts = createEmptyMetaReviewRouteCounts();

  private metaReviewAutoReworkDispatches = 0;

  private metaReviewHumanGateEntries = 0;

  private metaReviewRolloutBlockedEvents = 0;

  private metaReviewPairflowCommandPathStaleCount = 0;

  private readonly metaReviewBlockingReasonCodeCounts: Record<string, number> = {};

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

  private observeBubblePassedEvent(
    event: MetricsReportEvent,
    bubble: BubbleAggregateState
  ): void {
    if (event.actorRole === "implementer" && event.round !== null) {
      const roundKey = buildRoundKey(event.bubbleInstanceId, event.round);
      const existing = this.pendingImplementerPassByRound.get(roundKey) ?? [];
      existing.push(event.tsMs);
      this.pendingImplementerPassByRound.set(roundKey, existing);
      return;
    }

    if (event.actorRole !== "reviewer") {
      return;
    }

    if (event.round !== null) {
      this.consumeReviewCycle(event.bubbleInstanceId, event.round, event.tsMs);
    }

    const parsedFindings = parseReviewerFindingMetadata(event.metadata);
    if (parsedFindings === null) {
      return;
    }

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

  private observeBubbleConvergedEvent(
    event: MetricsReportEvent,
    bubble: BubbleAggregateState
  ): void {
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
  }

  private observeBubbleReworkRequestedEvent(
    event: MetricsReportEvent,
    bubble: BubbleAggregateState
  ): void {
    if (
      bubble.firstConvergedAtMs !== null &&
      event.tsMs > bubble.firstConvergedAtMs &&
      !bubble.falseConvergenceCounted
    ) {
      bubble.falseConvergenceCounted = true;
      this.falseConvergenceCount += 1;
    }
  }

  private observeMetaReviewEvent(event: MetricsReportEvent): void {
    if (event.eventType === "bubble_meta_review_routed") {
      const routeKey = asMetaReviewRouteKey(event.metadata.gate_route);
      if (routeKey !== null) {
        this.metaReviewRouteCounts[routeKey] += 1;
      }
      return;
    }

    if (event.eventType === "bubble_meta_review_auto_rework_dispatched") {
      this.metaReviewAutoReworkDispatches += 1;
      return;
    }

    if (event.eventType === "bubble_meta_review_human_gate_reached") {
      this.metaReviewHumanGateEntries += 1;
      return;
    }

    if (event.eventType === "bubble_meta_review_rollout_blocked") {
      this.metaReviewRolloutBlockedEvents += 1;
      const blockingReasonCodes = parseJsonStringArray(
        event.metadata.blocking_reason_codes
      );
      incrementReasonCodeCounts(
        this.metaReviewBlockingReasonCodeCounts,
        blockingReasonCodes
      );
      if (blockingReasonCodes.includes("PAIRFLOW_COMMAND_PATH_STALE")) {
        this.metaReviewPairflowCommandPathStaleCount += 1;
      }
    }
  }

  public observe(event: MetricsReportEvent): void {
    const bubble = this.getOrCreateBubbleState(event.bubbleInstanceId);
    if (isHumanInterventionEvent(event)) {
      bubble.hasHumanIntervention = true;
    }

    switch (event.eventType) {
      case "bubble_passed":
        this.observeBubblePassedEvent(event, bubble);
        return;
      case "bubble_converged":
        this.observeBubbleConvergedEvent(event, bubble);
        return;
      case "bubble_rework_requested":
        this.observeBubbleReworkRequestedEvent(event, bubble);
        return;
      case "bubble_meta_review_routed":
      case "bubble_meta_review_auto_rework_dispatched":
      case "bubble_meta_review_human_gate_reached":
      case "bubble_meta_review_rollout_blocked":
        this.observeMetaReviewEvent(event);
        return;
      default:
        return;
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
      escaped_p1_after_converged: this.escapedP1AfterConverged,
      meta_review_rollout_signals: {
        route_counts: {
          ...this.metaReviewRouteCounts
        },
        auto_rework_dispatches: this.metaReviewAutoReworkDispatches,
        human_gate_entries: this.metaReviewHumanGateEntries,
        rollout_blocked_events: this.metaReviewRolloutBlockedEvents,
        pairflow_command_path_stale_count:
          this.metaReviewPairflowCommandPathStaleCount,
        blocking_reason_code_counts: {
          ...this.metaReviewBlockingReasonCodeCounts
        }
      }
    };
  }
}
