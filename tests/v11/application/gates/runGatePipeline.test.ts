import { describe, expect, it } from "vitest";

import { runGatePipeline } from "../../../../src/v11/application/gates/runGatePipeline.js";

describe("runGatePipeline", () => {
  it("runs gate evaluators in declared order", async () => {
    const callOrder: string[] = [];

    const result = await runGatePipeline({
      profile: "converged",
      context: { bubble_id: "b_gate_001" },
      gates: [
        {
          gate_id: "policy_gate",
          evaluate: async () => {
            callOrder.push("policy_gate");
            return { gate_id: "policy_gate", outcome: "pass" as const };
          }
        },
        {
          gate_id: "validation_gate",
          evaluate: async () => {
            callOrder.push("validation_gate");
            return { gate_id: "validation_gate", outcome: "warn" as const };
          }
        },
        {
          gate_id: "delivery_gate",
          evaluate: async () => {
            callOrder.push("delivery_gate");
            return { gate_id: "delivery_gate", outcome: "pass" as const };
          }
        }
      ]
    });

    expect(callOrder).toEqual([
      "policy_gate",
      "validation_gate",
      "delivery_gate"
    ]);
    expect(result.final_outcome).toBe("warn");
  });

  it("short-circuits remaining gates after a block outcome", async () => {
    const callOrder: string[] = [];

    const result = await runGatePipeline({
      profile: "converged",
      context: { bubble_id: "b_gate_002" },
      gates: [
        {
          gate_id: "policy_gate",
          evaluate: async () => {
            callOrder.push("policy_gate");
            return { gate_id: "policy_gate", outcome: "warn" as const };
          }
        },
        {
          gate_id: "validation_gate",
          evaluate: async () => {
            callOrder.push("validation_gate");
            return {
              gate_id: "validation_gate",
              outcome: "block" as const,
              diagnostics: ["blocked"]
            };
          }
        },
        {
          gate_id: "delivery_gate",
          evaluate: async () => {
            callOrder.push("delivery_gate");
            return { gate_id: "delivery_gate", outcome: "pass" as const };
          }
        }
      ]
    });

    expect(callOrder).toEqual(["policy_gate", "validation_gate"]);
    expect(result.final_outcome).toBe("block");
    expect(result.stopped_at_gate_id).toBe("validation_gate");
    expect(result.gate_outcomes).toHaveLength(2);
  });

  it("skips listed gates and ignores unknown skip_list entries", async () => {
    const callOrder: string[] = [];

    const result = await runGatePipeline({
      profile: "converged",
      context: { bubble_id: "b_gate_003" },
      skip_list: ["validation_gate", "missing_gate"],
      gates: [
        {
          gate_id: "policy_gate",
          evaluate: async () => {
            callOrder.push("policy_gate");
            return { gate_id: "policy_gate", outcome: "pass" as const };
          }
        },
        {
          gate_id: "validation_gate",
          evaluate: async () => {
            callOrder.push("validation_gate");
            return { gate_id: "validation_gate", outcome: "pass" as const };
          }
        }
      ]
    });

    expect(callOrder).toEqual(["policy_gate"]);
    expect(result.skipped_gate_ids).toEqual(["validation_gate"]);
    expect(result.diagnostics).toContain(
      "Ignored unknown skip_list gate id: missing_gate"
    );
  });

  it("wraps evaluator exceptions with gate id context", async () => {
    const error = await runGatePipeline({
      profile: "converged",
      context: { bubble_id: "b_gate_004" },
      gates: [
        {
          gate_id: "policy_gate",
          evaluate: async () => {
            throw new Error("boom");
          }
        }
      ]
    }).catch((caught: unknown) => caught);

    expect(error).toMatchObject({
      message: "Gate evaluator failed: policy_gate",
      reasonCode: "GATE_EVALUATOR_FAILED",
      context: {
        profile: "converged",
        gate_id: "policy_gate"
      }
    });
    expect(error).toBeInstanceOf(Error);
    if (!(error instanceof Error)) {
      throw new Error("expected gate pipeline error");
    }
    expect(error.cause).toBeInstanceOf(Error);
    if (!(error.cause instanceof Error)) {
      throw new Error("expected original evaluator cause");
    }
    expect(error.cause.message).toBe("boom");
  });
});
