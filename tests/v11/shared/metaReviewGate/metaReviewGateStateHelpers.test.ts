import { describe, expect, it } from "vitest";

import { resolveHumanGateRoute } from "../../../../src/v11/shared/metaReviewGate/internal/metaReviewGateStateHelpers.js";

describe("resolveHumanGateRoute", () => {
  it.each([
    {
      name: "routes approve recommendations to the human approve path",
      input: {
        recommendation: "approve",
        budgetAvailable: true,
        thresholdStatus: null
      },
      expected: "human_gate_approve"
    },
    {
      name: "routes rework without budget to budget exhausted",
      input: {
        recommendation: "rework",
        budgetAvailable: false,
        thresholdStatus: null
      },
      expected: "human_gate_budget_exhausted"
    },
    {
      name: "routes resolved threshold misses to threshold_not_met",
      input: {
        recommendation: "rework",
        budgetAvailable: true,
        thresholdStatus: "not_met"
      },
      expected: "human_gate_threshold_not_met"
    },
    {
      name: "routes unresolved threshold authority to threshold_unresolved",
      input: {
        recommendation: "rework",
        budgetAvailable: true,
        thresholdStatus: "unresolved"
      },
      expected: "human_gate_threshold_unresolved"
    },
    {
      name: "routes incomplete threshold authority to threshold_unresolved",
      input: {
        recommendation: "rework",
        budgetAvailable: true,
        thresholdStatus: "incomplete"
      },
      expected: "human_gate_threshold_unresolved"
    },
    {
      name: "routes inconclusive recommendations to the human inconclusive path",
      input: {
        recommendation: "inconclusive",
        budgetAvailable: true,
        thresholdStatus: null
      },
      expected: "human_gate_inconclusive"
    }
  ] as const satisfies ReadonlyArray<{
    name: string;
    input: Parameters<typeof resolveHumanGateRoute>[0];
    expected: ReturnType<typeof resolveHumanGateRoute>;
  }>)("$name", ({ input, expected }) => {
    expect(resolveHumanGateRoute(input)).toBe(expected);
  });

  it("throws when rework has budget but no threshold decision is available", () => {
    expect(() =>
      resolveHumanGateRoute({
        recommendation: "rework",
        budgetAvailable: true,
        thresholdStatus: null
      })
    ).toThrowError(/without threshold decision/);
  });
});
