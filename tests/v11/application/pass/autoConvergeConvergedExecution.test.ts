import { describe, expect, it } from "vitest";

import type { EmitConvergedResult } from "../../../../src/v11/shared/converged/convergedCommandTypes.js";
import { executeAutoConvergeConverged } from "../../../../src/v11/application/pass/autoConvergeConvergedExecution.js";

function buildConvergedResult(): EmitConvergedResult {
  return {
    bubbleId: "b_123",
    convergenceSequence: 12,
    approvalRequestSequence: 13
  } as unknown as EmitConvergedResult;
}

describe("executeAutoConvergeConverged", () => {
  it("forwards convergence input and optional notification dependencies", async () => {
    const now = new Date("2026-03-19T12:00:00.000Z");
    const expectedResult = buildConvergedResult();
    let capturedInput: Parameters<
      Parameters<typeof executeAutoConvergeConverged>[1]["emitConvergedFromWorkspace"]
    >[0] | undefined;
    let capturedDependencies: Parameters<
      Parameters<typeof executeAutoConvergeConverged>[1]["emitConvergedFromWorkspace"]
    >[1] | undefined;

    const result = await executeAutoConvergeConverged(
      {
        summary: "auto converge",
        refs: ["a", "b"],
        cwd: "/tmp/wt",
        now,
        expectedStateFingerprint: "fp_1",
        expectedRound: 2,
        expectedReviewer: "claude",
        onDownstreamRejected: () => {
          throw new Error("unexpected");
        }
      },
      {
        emitConvergedFromWorkspace: async (input, dependencies) => {
          capturedInput = input;
          capturedDependencies = dependencies;
          return expectedResult;
        },
        emitDeliveryNotificationAck: async () => ({
          status: "accepted" as const,
          message: "delivered",
          sessionName: "pf_auto_converged",
          targetPaneIndex: 1
        }),
        emitBubbleNotification: async () => ({
          kind: "converged",
          attempted: false,
          delivered: false,
          soundPath: null,
          reason: "disabled"
        })
      }
    );

    expect(capturedInput).toEqual({
      summary: "auto converge",
      refs: ["a", "b"],
      cwd: "/tmp/wt",
      now,
      expectedStateFingerprint: "fp_1",
      expectedRound: 2,
      expectedReviewer: "claude"
    });
    expect(typeof capturedDependencies?.emitDeliveryNotificationAck).toBe("function");
    expect(typeof capturedDependencies?.emitBubbleNotification).toBe("function");
    expect(result).toBe(expectedResult);
  });

  it("forwards the canonical delivery override into auto-converge execution", async () => {
    let capturedDependencies: Parameters<
      Parameters<typeof executeAutoConvergeConverged>[1]["emitConvergedFromWorkspace"]
    >[1] | undefined;

    const emitDeliveryNotificationAck = (() => undefined) as never;

    await executeAutoConvergeConverged(
      {
        summary: "auto converge",
        refs: [],
        cwd: "/tmp/wt",
        now: new Date("2026-03-19T12:00:00.000Z"),
        expectedStateFingerprint: "fp_1",
        expectedRound: 2,
        expectedReviewer: "claude",
        onDownstreamRejected: () => {
          throw new Error("unexpected");
        }
      },
      {
        emitConvergedFromWorkspace: async (_input, dependencies) => {
          capturedDependencies = dependencies;
          return buildConvergedResult();
        },
        emitDeliveryNotificationAck
      }
    );

    expect(capturedDependencies?.emitDeliveryNotificationAck).toBe(
      emitDeliveryNotificationAck
    );
  });

  it("maps thrown downstream errors to rejection callback reason", async () => {
    await expect(() =>
      executeAutoConvergeConverged(
        {
          summary: "auto converge",
          refs: [],
          cwd: "/tmp/wt",
          now: new Date("2026-03-19T12:00:00.000Z"),
          expectedStateFingerprint: "fp_1",
          expectedRound: 2,
          expectedReviewer: "claude",
          onDownstreamRejected: (reason) => {
            throw new Error(`wrapped:${reason}`);
          }
        },
        {
          emitConvergedFromWorkspace: async () => {
            throw new Error("downstream failed");
          }
        }
      )
    ).rejects.toThrow("wrapped:downstream failed");
  });

  it("prefers structured detailMessage over normalized public message for downstream rejection", async () => {
    await expect(() =>
      executeAutoConvergeConverged(
        {
          summary: "auto converge",
          refs: [],
          cwd: "/tmp/wt",
          now: new Date("2026-03-19T12:00:00.000Z"),
          expectedStateFingerprint: "fp_1",
          expectedRound: 2,
          expectedReviewer: "claude",
          onDownstreamRejected: (reason) => {
            throw new Error(`wrapped:${reason}`);
          }
        },
        {
          emitConvergedFromWorkspace: async () => {
            throw Object.assign(
              new Error(
                "CONVERGED_SUMMARY_VERIFIER_GATE_BLOCKED: Convergence validation failed context={\"command_name\":\"converged\"}"
              ),
              {
                detailMessage: "Convergence validation failed",
                reasonCode: "CONVERGED_SUMMARY_VERIFIER_GATE_BLOCKED",
                context: { command_name: "converged" }
              }
            );
          }
        }
      )
    ).rejects.toThrow("wrapped:Convergence validation failed");
  });
});
