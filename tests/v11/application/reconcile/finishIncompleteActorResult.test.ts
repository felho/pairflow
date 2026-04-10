import { describe, expect, it, vi } from "vitest";

import { finishIncompleteActorResult } from "../../../../src/v11/application/reconcile/finishIncompleteActorResult.js";
import type { BubbleExecutionContext } from "../../../../src/types/bubble.js";

function buildExecutionContext(): BubbleExecutionContext {
  return {
    active_role: "meta_reviewer",
    awaited_output_type: "meta_review_result",
    handoff_id: "meta_review:bubble-1:round:1:attempt:1",
    round: 1,
    started_at: "2026-04-10T10:00:00.000Z",
    deadline_at: "2026-04-10T10:30:00.000Z",
    attempt: 1
  };
}

describe("finishIncompleteActorResult", () => {
  it("routes canonical finish from explicit authority", async () => {
    const routePolicy = vi.fn(async () => ({
      appliedRoute: "human_gate_approve" as const,
      mutationKind: "ready_for_human_approval" as const,
      canonicalRun: {
        runId: "run-1",
        recommendation: "approve"
      },
      warnings: ["route warning"],
      diagnostics: ["route diagnostic"]
    }));
    const applyRoute = vi.fn(async () => ({
      bubbleId: "bubble-1",
      routeSequence: 17,
      routeEnvelope: { type: "APPROVAL_REQUEST" },
      state: { state: "READY_FOR_HUMAN_APPROVAL" },
      warnings: ["apply warning"],
      diagnostics: ["apply diagnostic"]
    }));

    const result = await finishIncompleteActorResult(
      {
        bubbleId: "bubble-1",
        repoPath: "/repo",
        cwd: "/repo/worktree",
        now: new Date("2026-04-10T10:05:00.000Z"),
        executionContext: buildExecutionContext(),
        runResult: {
          runId: "run-1",
          recommendation: "approve"
        },
        routePolicy,
        summary: "Recovered canonical route.",
        refs: ["artifacts/evidence.log"],
        callerTag: "test",
        snapshotState: {
          auto_rework_count: 0
        }
      },
      {
        applyRoute
      }
    );

    expect(routePolicy).toHaveBeenCalledTimes(1);
    expect(applyRoute).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      bubbleId: "bubble-1",
      appliedRoute: "human_gate_approve",
      routeSequence: 17,
      routeEnvelope: { type: "APPROVAL_REQUEST" },
      state: { state: "READY_FOR_HUMAN_APPROVAL" },
      canonicalRun: {
        runId: "run-1",
        recommendation: "approve"
      },
      mutationKind: "ready_for_human_approval",
      warnings: ["route warning", "apply warning"],
      diagnostics: ["route diagnostic", "apply diagnostic"]
    });
  });

  it.each([
    {
      label: "keeps left-only arrays",
      routeWarnings: ["route warning"],
      applyWarnings: undefined,
      expectedWarnings: ["route warning"],
      routeDiagnostics: ["route diagnostic"],
      applyDiagnostics: undefined,
      expectedDiagnostics: ["route diagnostic"]
    },
    {
      label: "keeps right-only arrays",
      routeWarnings: undefined,
      applyWarnings: ["apply warning"],
      expectedWarnings: ["apply warning"],
      routeDiagnostics: undefined,
      applyDiagnostics: ["apply diagnostic"],
      expectedDiagnostics: ["apply diagnostic"]
    },
    {
      label: "omits arrays when both sides are empty",
      routeWarnings: undefined,
      applyWarnings: undefined,
      expectedWarnings: undefined,
      routeDiagnostics: undefined,
      applyDiagnostics: undefined,
      expectedDiagnostics: undefined
    }
  ])(
    "merges optional arrays when %s",
    async ({
      routeWarnings,
      applyWarnings,
      expectedWarnings,
      routeDiagnostics,
      applyDiagnostics,
      expectedDiagnostics
    }) => {
      const result = await finishIncompleteActorResult(
        {
          bubbleId: "bubble-1",
          repoPath: "/repo",
          cwd: "/repo/worktree",
          now: new Date("2026-04-10T10:05:00.000Z"),
          executionContext: buildExecutionContext(),
          runResult: {
            runId: "run-1",
            recommendation: "approve"
          },
          routePolicy: async () => ({
            appliedRoute: "human_gate_approve" as const,
            mutationKind: "ready_for_human_approval" as const,
            canonicalRun: {
              runId: "run-1",
              recommendation: "approve"
            },
            ...(routeWarnings !== undefined ? { warnings: routeWarnings } : {}),
            ...(routeDiagnostics !== undefined
              ? { diagnostics: routeDiagnostics }
              : {})
          })
        },
        {
          applyRoute: async () => ({
            bubbleId: "bubble-1",
            routeSequence: 1,
            routeEnvelope: { type: "APPROVAL_REQUEST" },
            state: { state: "READY_FOR_HUMAN_APPROVAL" },
            ...(applyWarnings !== undefined ? { warnings: applyWarnings } : {}),
            ...(applyDiagnostics !== undefined
              ? { diagnostics: applyDiagnostics }
              : {})
          })
        }
      );

      expect(result.warnings).toEqual(expectedWarnings);
      expect(result.diagnostics).toEqual(expectedDiagnostics);
    }
  );

  it("fails closed when execution context is missing", async () => {
    await expect(
      finishIncompleteActorResult(
        {
          bubbleId: "bubble-1",
          repoPath: "/repo",
          cwd: "/repo/worktree",
          now: new Date("2026-04-10T10:05:00.000Z"),
          executionContext: null as unknown as BubbleExecutionContext,
          runResult: {
            runId: "run-1"
          },
          routePolicy: async () => ({
            appliedRoute: "human_gate_approve" as const,
            mutationKind: "ready_for_human_approval" as const,
            canonicalRun: {
              runId: "run-1"
            }
          })
        },
        {
          applyRoute: async () => ({
            bubbleId: "bubble-1",
            routeSequence: 1,
            routeEnvelope: { type: "APPROVAL_REQUEST" },
            state: { state: "READY_FOR_HUMAN_APPROVAL" }
          })
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "ACTOR_RECONCILE_CONTEXT_INVALID"
    });
  });

  it.each([null, []])(
    "fails closed when canonical run result is invalid: %j",
    async (runResult) => {
      await expect(
        finishIncompleteActorResult(
          {
            bubbleId: "bubble-1",
            repoPath: "/repo",
            cwd: "/repo/worktree",
            now: new Date("2026-04-10T10:05:00.000Z"),
            executionContext: buildExecutionContext(),
            runResult: runResult as unknown,
            routePolicy: async () => ({
              appliedRoute: "human_gate_approve" as const,
              mutationKind: "ready_for_human_approval" as const,
              canonicalRun: {
                runId: "run-1"
              }
            })
          },
          {
            applyRoute: async () => ({
              bubbleId: "bubble-1",
              routeSequence: 1,
              routeEnvelope: { type: "APPROVAL_REQUEST" },
              state: { state: "READY_FOR_HUMAN_APPROVAL" }
            })
          }
        )
      ).rejects.toMatchObject({
        reasonCode: "ACTOR_RECONCILE_INPUT_INVALID"
      });
    }
  );

  it("fails closed when route policy is missing", async () => {
    await expect(
      finishIncompleteActorResult(
        {
          bubbleId: "bubble-1",
          repoPath: "/repo",
          cwd: "/repo/worktree",
          now: new Date("2026-04-10T10:05:00.000Z"),
          executionContext: buildExecutionContext(),
          runResult: {
            runId: "run-1"
          },
          routePolicy: undefined as unknown as never
        },
        {
          applyRoute: async () => ({
            bubbleId: "bubble-1",
            routeSequence: 1,
            routeEnvelope: { type: "APPROVAL_REQUEST" },
            state: { state: "READY_FOR_HUMAN_APPROVAL" }
          })
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "ACTOR_RECONCILE_INPUT_INVALID"
    });
  });

  it("fails closed when applyRoute dependency is missing", async () => {
    await expect(
      finishIncompleteActorResult({
        bubbleId: "bubble-1",
        repoPath: "/repo",
        cwd: "/repo/worktree",
        now: new Date("2026-04-10T10:05:00.000Z"),
        executionContext: buildExecutionContext(),
        runResult: {
          runId: "run-1"
        },
        routePolicy: async () => ({
          appliedRoute: "human_gate_approve" as const,
          mutationKind: "ready_for_human_approval" as const,
          canonicalRun: {
            runId: "run-1"
          }
        })
      })
    ).rejects.toMatchObject({
      reasonCode: "ACTOR_RECONCILE_INPUT_INVALID"
    });
  });

  it("fails closed when applyRoute returns an incomplete route result", async () => {
    await expect(
      finishIncompleteActorResult(
        {
          bubbleId: "bubble-1",
          repoPath: "/repo",
          cwd: "/repo/worktree",
          now: new Date("2026-04-10T10:05:00.000Z"),
          executionContext: buildExecutionContext(),
          runResult: {
            runId: "run-1"
          },
          routePolicy: async () => ({
            appliedRoute: "human_gate_approve" as const,
            mutationKind: "ready_for_human_approval" as const,
            canonicalRun: {
              runId: "run-1"
            }
          })
        },
        {
          applyRoute: async () =>
            ({
              bubbleId: "bubble-1"
            }) as unknown as {
              bubbleId: string;
              routeSequence: number;
              routeEnvelope: { type: string };
              state: { state: string };
            }
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "ACTOR_RECONCILE_INPUT_INVALID"
    });
  });

  it("fails closed when applyRoute changes the canonical bubble identity", async () => {
    await expect(
      finishIncompleteActorResult(
        {
          bubbleId: "bubble-1",
          repoPath: "/repo",
          cwd: "/repo/worktree",
          now: new Date("2026-04-10T10:05:00.000Z"),
          executionContext: buildExecutionContext(),
          runResult: {
            runId: "run-1"
          },
          routePolicy: async () => ({
            appliedRoute: "human_gate_approve" as const,
            mutationKind: "ready_for_human_approval" as const,
            canonicalRun: {
              runId: "run-1"
            }
          })
        },
        {
          applyRoute: async () => ({
            bubbleId: "bubble-2",
            routeSequence: 1,
            routeEnvelope: { type: "APPROVAL_REQUEST" },
            state: { state: "READY_FOR_HUMAN_APPROVAL" }
          })
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "ACTOR_RECONCILE_INPUT_INVALID"
    });
  });

  it.each([
    {
      label: "routeEnvelope is not an object",
      applyRoute: async () =>
        ({
          bubbleId: "bubble-1",
          routeSequence: 1,
          routeEnvelope: "APPROVAL_REQUEST",
          state: { state: "READY_FOR_HUMAN_APPROVAL" }
        }) as unknown as {
          bubbleId: string;
          routeSequence: number;
          routeEnvelope: { type: string };
          state: { state: string };
        }
    },
    {
      label: "state is not an object",
      applyRoute: async () =>
        ({
          bubbleId: "bubble-1",
          routeSequence: 1,
          routeEnvelope: { type: "APPROVAL_REQUEST" },
          state: "READY_FOR_HUMAN_APPROVAL"
        }) as unknown as {
          bubbleId: string;
          routeSequence: number;
          routeEnvelope: { type: string };
          state: { state: string };
        }
    },
    {
      label: "canonicalRun override is not an object",
      applyRoute: async () =>
        ({
          bubbleId: "bubble-1",
          routeSequence: 1,
          routeEnvelope: { type: "APPROVAL_REQUEST" },
          state: { state: "READY_FOR_HUMAN_APPROVAL" },
          canonicalRun: "run-1"
        }) as unknown as {
          bubbleId: string;
          routeSequence: number;
          routeEnvelope: { type: string };
          state: { state: string };
          canonicalRun: { runId: string };
        }
    }
  ])("fails closed when applyRoute returns invalid structured output: $label", async ({
    applyRoute
  }) => {
    await expect(
      finishIncompleteActorResult(
        {
          bubbleId: "bubble-1",
          repoPath: "/repo",
          cwd: "/repo/worktree",
          now: new Date("2026-04-10T10:05:00.000Z"),
          executionContext: buildExecutionContext(),
          runResult: {
            runId: "run-1"
          },
          routePolicy: async () => ({
            appliedRoute: "human_gate_approve" as const,
            mutationKind: "ready_for_human_approval" as const,
            canonicalRun: {
              runId: "run-1"
            }
          })
        },
        {
          applyRoute
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "ACTOR_RECONCILE_INPUT_INVALID"
    });
  });

  it("fails closed when route policy returns an invalid route decision", async () => {
    await expect(
      finishIncompleteActorResult(
        {
          bubbleId: "bubble-1",
          repoPath: "/repo",
          cwd: "/repo/worktree",
          now: new Date("2026-04-10T10:05:00.000Z"),
          executionContext: buildExecutionContext(),
          runResult: {
            runId: "run-1"
          },
          routePolicy: async () => ({
            appliedRoute: "" as never,
            mutationKind: "" as never,
            canonicalRun: {
              runId: "run-1"
            }
          })
        },
        {
          applyRoute: async () => ({
            bubbleId: "bubble-1",
            routeSequence: 1,
            routeEnvelope: { type: "APPROVAL_REQUEST" },
            state: { state: "READY_FOR_HUMAN_APPROVAL" }
          })
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "ACTOR_RECONCILE_INPUT_INVALID"
    });
  });

  it("fails closed when route policy omits canonicalRun from the route decision", async () => {
    await expect(
      finishIncompleteActorResult(
        {
          bubbleId: "bubble-1",
          repoPath: "/repo",
          cwd: "/repo/worktree",
          now: new Date("2026-04-10T10:05:00.000Z"),
          executionContext: buildExecutionContext(),
          runResult: {
            runId: "run-1"
          },
          routePolicy: async () => ({
            appliedRoute: "human_gate_approve" as const,
            mutationKind: "ready_for_human_approval" as const,
            canonicalRun: undefined as unknown as { runId: string }
          })
        },
        {
          applyRoute: async () => ({
            bubbleId: "bubble-1",
            routeSequence: 1,
            routeEnvelope: { type: "APPROVAL_REQUEST" },
            state: { state: "READY_FOR_HUMAN_APPROVAL" }
          })
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "ACTOR_RECONCILE_INPUT_INVALID"
    });
  });
});
