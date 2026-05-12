import { describe, expect, it } from "vitest";

import { buildRunningExecutionContext } from "../../../../../src/v11/domain/state/execution/executionContext.js";
import {
  assertParsedDomainBubbleStateSnapshot,
  parseDomainBubbleStateSnapshot
} from "../../../../../src/v11/domain/state/stateSchema.js";
import { buildBubbleStateSnapshotVariant } from "../../../../../src/v11/domain/state/snapshot/buildBubbleStateSnapshot.js";
import { discriminateBubbleStateSnapshotKind } from "../../../../../src/v11/domain/state/authority/kindDiscrimination.js";
import {
  isActiveSnapshot,
  isMetaReviewAuthority,
  isRunningSnapshot
} from "../../../../../src/v11/domain/state/snapshot/guards.js";
import { toPersistedSnapshot } from "../../../../../src/v11/domain/state/snapshot/projection.js";
import type { PersistedBubbleStateSnapshot } from "../../../../../src/v11/domain/state/snapshot/persistedBubbleStateSnapshot.js";

const baseTimestamp = "2026-05-12T10:00:00.000Z";

function persistedRunning(round: number): PersistedBubbleStateSnapshot {
  return {
    bubble_id: "b_test_variant_running",
    state: "RUNNING",
    round,
    active_agent: "codex",
    active_role: "implementer",
    active_since: baseTimestamp,
    execution_context: buildRunningExecutionContext({
      bubbleId: "b_test_variant_running",
      round,
      activeRole: "implementer",
      startedAt: baseTimestamp,
      watchdogTimeoutMinutes: 30
    }),
    round_role_history: [
      {
        round,
        implementer: "codex",
        reviewer: "claude",
        switched_at: baseTimestamp
      }
    ],
    last_command_at: baseTimestamp
  };
}

describe("buildBubbleStateSnapshotVariant", () => {
  it("discriminates inactive_initial for CREATED state", () => {
    const persisted: PersistedBubbleStateSnapshot = {
      bubble_id: "b_test_variant_initial",
      state: "CREATED",
      round: 0,
      active_agent: null,
      active_role: null,
      active_since: null,
      execution_context: null,
      round_role_history: [],
      last_command_at: null
    };
    const variant = buildBubbleStateSnapshotVariant(persisted);
    expect(variant.kind).toBe("inactive_initial");
    expect(variant.state).toBe("CREATED");
  });

  it("discriminates running_ideation for RUNNING + round=0", () => {
    const persisted: PersistedBubbleStateSnapshot = {
      bubble_id: "b_test_variant_ideation",
      state: "RUNNING",
      round: 0,
      active_agent: null,
      active_role: null,
      active_since: null,
      execution_context: null,
      round_role_history: [],
      last_command_at: baseTimestamp
    };
    const variant = buildBubbleStateSnapshotVariant(persisted);
    expect(variant.kind).toBe("running_ideation");
  });

  it("discriminates running_standard for RUNNING + round>=1 + non-meta-reviewer", () => {
    const variant = buildBubbleStateSnapshotVariant(persistedRunning(2));
    expect(variant.kind).toBe("running_standard");
    if (variant.kind === "running_standard") {
      expect(variant.active_agent).toBe("codex");
      expect(variant.active_role).toBe("implementer");
      expect(variant.execution_context).not.toBeNull();
    }
  });

  it.each([
    ["APPROVED_FOR_COMMIT", "terminal_clean"] as const,
    ["COMMITTED", "terminal_clean"] as const,
    ["DONE", "terminal_clean"] as const,
    ["FAILED", "terminal_failed"] as const,
    ["CANCELLED", "terminal_failed"] as const
  ])("discriminates %s as %s", (lifecycle, kind) => {
    const persisted: PersistedBubbleStateSnapshot = {
      bubble_id: "b_test_variant_terminal",
      state: lifecycle,
      round: 3,
      active_agent: null,
      active_role: null,
      active_since: null,
      execution_context: null,
      round_role_history: [],
      last_command_at: baseTimestamp
    };
    expect(discriminateBubbleStateSnapshotKind(persisted)).toBe(kind);
    expect(buildBubbleStateSnapshotVariant(persisted).kind).toBe(kind);
  });
});

describe("guards", () => {
  it("isRunningSnapshot narrows running variants", () => {
    const variant = buildBubbleStateSnapshotVariant(persistedRunning(1));
    expect(isRunningSnapshot(variant)).toBe(true);
    expect(isActiveSnapshot(variant)).toBe(true);
    expect(isMetaReviewAuthority(variant)).toBe(false);
  });
});

describe("parseDomainBubbleStateSnapshot", () => {
  it("returns the variant union on valid input", () => {
    const result = parseDomainBubbleStateSnapshot(persistedRunning(2));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.kind).toBe("running_standard");
    }
  });

  it("propagates parser errors", () => {
    const result = parseDomainBubbleStateSnapshot({ bubble_id: "" });
    expect(result.ok).toBe(false);
  });

  it("assertParsedDomainBubbleStateSnapshot throws on invalid input", () => {
    expect(() =>
      assertParsedDomainBubbleStateSnapshot({ bubble_id: "" })
    ).toThrow();
  });
});

describe("toPersistedSnapshot", () => {
  it("round-trips kind-discriminated variant back to persisted shape", () => {
    const persisted = persistedRunning(2);
    const variant = buildBubbleStateSnapshotVariant(persisted);
    const projected = toPersistedSnapshot(variant);
    expect(projected.bubble_id).toBe(persisted.bubble_id);
    expect(projected.state).toBe(persisted.state);
    expect(projected.active_role).toBe(persisted.active_role);
    expect(projected.execution_context).toEqual(persisted.execution_context);
    expect(Object.hasOwn(projected, "kind")).toBe(false);
  });
});
