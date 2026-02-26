import { describe, expect, it } from "vitest";

import {
  clearReportedBubbleEventWarnings,
  emitBubbleLifecycleEventBestEffort
} from "../../../src/core/metrics/bubbleEvents.js";

describe("bubble metrics best-effort warnings", () => {
  it("deduplicates repeated warning keys and can be reset", async () => {
    clearReportedBubbleEventWarnings();
    const warnings: string[] = [];

    const emit = () =>
      emitBubbleLifecycleEventBestEffort({
        repoPath: "/tmp/repo",
        bubbleId: "b_warn_01",
        bubbleInstanceId: "",
        eventType: "bubble_passed",
        round: 1,
        actorRole: "implementer",
        metadata: {},
        reportWarning: (message) => {
          warnings.push(message);
        }
      });

    await emit();
    await emit();
    expect(warnings).toHaveLength(1);

    clearReportedBubbleEventWarnings();
    await emit();
    expect(warnings).toHaveLength(2);
  });

  it("caps dedupe key memory and clears when cap is reached", async () => {
    clearReportedBubbleEventWarnings();
    const warnings: string[] = [];

    for (let index = 0; index <= 512; index += 1) {
      await emitBubbleLifecycleEventBestEffort({
        repoPath: "/tmp/repo",
        bubbleId: "b_warn_cap_01",
        bubbleInstanceId: "",
        eventType: `event_${index}`,
        round: 1,
        actorRole: "implementer",
        metadata: {},
        reportWarning: (message) => {
          warnings.push(message);
        }
      });
    }

    await emitBubbleLifecycleEventBestEffort({
      repoPath: "/tmp/repo",
      bubbleId: "b_warn_cap_01",
      bubbleInstanceId: "",
      eventType: "event_0",
      round: 1,
      actorRole: "implementer",
      metadata: {},
      reportWarning: (message) => {
        warnings.push(message);
      }
    });

    expect(warnings).toHaveLength(514);
  });

  it("deduplicates by bubble id so different bubbles still warn", async () => {
    clearReportedBubbleEventWarnings();
    const warnings: string[] = [];

    const emitForBubble = (bubbleId: string) =>
      emitBubbleLifecycleEventBestEffort({
        repoPath: "/tmp/repo",
        bubbleId,
        bubbleInstanceId: "",
        eventType: "bubble_passed",
        round: 1,
        actorRole: "implementer",
        metadata: {},
        reportWarning: (message) => {
          warnings.push(message);
        }
      });

    await emitForBubble("b_warn_a");
    await emitForBubble("b_warn_b");

    expect(warnings).toHaveLength(2);
  });
});
