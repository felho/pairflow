import { describe, expect, it, vi } from "vitest";
import { createFakeExternalAdapters } from "./fakeExternalAdapters.js";
import {
  buildSmokeActorEmitArgv,
  createAlmostE2eSmokeRunner,
  type SmokeAuthoritySnapshot
} from "./runner.js";

function authority(
  overrides: Partial<SmokeAuthoritySnapshot> = {}
): SmokeAuthoritySnapshot {
  return {
    handoffId: "handoff-1",
    executionId: "execution-1",
    awaitedOutputType: "pass_result",
    activeRole: "implementer",
    round: 1,
    ...overrides
  };
}

describe("almost e2e smoke runner", () => {
  it("validates first advance against public launch authority", async () => {
    const authorities = [
      authority(),
      authority({
        handoffId: "handoff-rotated"
      })
    ];
    const runner = createAlmostE2eSmokeRunner({
      repoPath: "/tmp/repo",
      bubbleId: "bubble-1",
      scenario: {
        id: "scenario-1",
        steps: [
          {
            kind: "pass",
            summary: "done"
          }
        ]
      },
      authorityResolver: async () => authorities.shift() ?? null,
      actorEmitInvoker: vi.fn()
    });

    await runner.start({
      start: async (adapters) => {
        await adapters.launchBubbleSessionAck({
          bubbleId: "bubble-1",
          workspacePath: "/tmp/worktree",
          statusCommand: "pairflow bubble status",
          implementerCommand: "codex",
          reviewerCommand: "codex"
        });
      }
    });

    await expect(runner.advance()).rejects.toThrow(/SMOKE_STALE_AUTHORITY/);
  });

  it("refreshes public authority after the first advance", async () => {
    const emit = vi.fn(async () => ({ ok: true }));
    const authorities = [
      authority(),
      authority(),
      authority({
        handoffId: "handoff-2",
        executionId: "execution-2",
        activeRole: "reviewer",
        round: 2
      })
    ];
    const runner = createAlmostE2eSmokeRunner({
      repoPath: "/tmp/repo",
      bubbleId: "bubble-1",
      scenario: {
        id: "scenario-1",
        steps: [
          {
            kind: "pass",
            summary: "implemented",
            expectedRole: "implementer",
            refs: ["logs/lint.log"]
          },
          {
            kind: "human_question",
            question: "Need decision?",
            expectedRole: "reviewer",
            expectedRound: 2
          }
        ]
      },
      authorityResolver: async () => authorities.shift() ?? null,
      actorEmitInvoker: emit
    });

    await runner.start({
      start: async (adapters) => {
        await adapters.launchBubbleSessionAck({
          bubbleId: "bubble-1",
          workspacePath: "/tmp/worktree",
          statusCommand: "pairflow bubble status",
          implementerCommand: "codex",
          reviewerCommand: "codex"
        });
      }
    });

    const first = await runner.advance();
    const second = await runner.advance();

    expect(first.command.args).toContain("handoff-1");
    expect(second.command.args).toContain("handoff-2");
    expect(emit).toHaveBeenCalledTimes(2);
  });

  it("builds structured actor emit argv without shell concatenation", () => {
    const argv = buildSmokeActorEmitArgv({
      repoPath: "/tmp/repo with spaces",
      bubbleId: "bubble-1",
      authority: authority(),
      step: {
        kind: "meta_review_result",
        round: 1,
        recommendation: "approve",
        summary: "quotes \" and $PATH stay literal",
        expectedStateFingerprint: "state-fp",
        reportJson: {
          note: "`literal`"
        },
        refs: ["logs/pass evidence.log"]
      }
    });

    expect(argv).toEqual([
      "agent",
      "emit",
      "--kind",
      "meta_review_result",
      "--repo",
      "/tmp/repo with spaces",
      "--bubble-id",
      "bubble-1",
      "--handoff-id",
      "handoff-1",
      "--execution-id",
      "execution-1",
      "--ref",
      "logs/pass evidence.log",
      "--expected-state-fingerprint",
      "state-fp",
      "--round",
      "1",
      "--recommendation",
      "approve",
      "--summary",
      "quotes \" and $PATH stay literal",
      "--report-json",
      "{\"note\":\"`literal`\"}"
    ]);
  });

  it("escapes finding refs containing commas in structured argv", () => {
    const argv = buildSmokeActorEmitArgv({
      repoPath: "/tmp/repo",
      bubbleId: "bubble-1",
      authority: authority(),
      step: {
        kind: "pass",
        summary: "done",
        findings: [
          {
            title: "Finding",
            severity: "P2",
            priority: "P2",
            refs: ["artifact://path,with,comma"]
          }
        ]
      }
    });

    expect(argv).toContain("P2:Finding|artifact://path\\,with\\,comma");
  });

  it("omits null meta-review rework target from argv", () => {
    const argv = buildSmokeActorEmitArgv({
      repoPath: "/tmp/repo",
      bubbleId: "bubble-1",
      authority: authority(),
      step: {
        kind: "meta_review_result",
        round: 1,
        recommendation: "approve",
        summary: "ok",
        reworkTargetMessage: null,
        reportJson: {}
      }
    });

    expect(argv).not.toContain("--rework-target-message");
  });

  it("fails closed when current authority is missing", async () => {
    const runner = createAlmostE2eSmokeRunner({
      repoPath: "/tmp/repo",
      bubbleId: "bubble-1",
      scenario: {
        id: "scenario-1",
        steps: [
          {
            kind: "pass",
            summary: "done"
          }
        ]
      },
      authorityResolver: async () => null,
      actorEmitInvoker: vi.fn()
    });

    await expect(
      runner.start({
        start: async (adapters) => {
          await adapters.launchBubbleSessionAck({
            bubbleId: "bubble-1",
            workspacePath: "/tmp/worktree",
            statusCommand: "pairflow bubble status",
            implementerCommand: "codex",
            reviewerCommand: "codex"
          });
        }
      })
    ).rejects.toThrow(/SMOKE_AUTHORITY_MISSING/);
  });

  it("does not consume the next unlabeled step when guard validation fails", async () => {
    const emit = vi.fn(async () => ({ ok: true }));
    const authorities = [
      authority(),
      authority({
        activeRole: "reviewer"
      }),
      authority()
    ];
    const runner = createAlmostE2eSmokeRunner({
      repoPath: "/tmp/repo",
      bubbleId: "bubble-1",
      scenario: {
        id: "scenario-1",
        steps: [
          {
            kind: "pass",
            summary: "first",
            expectedRole: "implementer"
          },
          {
            kind: "pass",
            summary: "second"
          }
        ]
      },
      authorityResolver: async () => authorities.shift() ?? null,
      actorEmitInvoker: emit
    });

    await runner.start({
      start: async (adapters) => {
        await adapters.launchBubbleSessionAck({
          bubbleId: "bubble-1",
          workspacePath: "/tmp/worktree",
          statusCommand: "pairflow bubble status",
          implementerCommand: "codex",
          reviewerCommand: "codex"
        });
      }
    });

    await expect(runner.advance()).rejects.toThrow(/SMOKE_STALE_AUTHORITY/);
    const retry = await runner.advance();

    expect(retry.step).toMatchObject({
      kind: "pass",
      summary: "first"
    });
    expect(emit).toHaveBeenCalledTimes(1);
  });

  it("rejects re-emitting an already completed labeled step", async () => {
    const emit = vi.fn(async () => ({ ok: true }));
    const runner = createAlmostE2eSmokeRunner({
      repoPath: "/tmp/repo",
      bubbleId: "bubble-1",
      scenario: {
        id: "scenario-1",
        steps: [
          {
            kind: "pass",
            label: "first",
            summary: "first"
          }
        ]
      },
      authorityResolver: async () => authority(),
      actorEmitInvoker: emit
    });
    await runner.start({
      start: async (adapters) => {
        await adapters.launchBubbleSessionAck({
          bubbleId: "bubble-1",
          workspacePath: "/tmp/worktree",
          statusCommand: "pairflow bubble status",
          implementerCommand: "codex",
          reviewerCommand: "codex"
        });
      }
    });

    await runner.advance("first");
    await expect(runner.advance("first")).rejects.toThrow(
      /SMOKE_STEP_ALREADY_ADVANCED/
    );
    expect(emit).toHaveBeenCalledTimes(1);
  });

  it("fails closed when a fingerprint guard cannot be proven by authority", async () => {
    const runner = createAlmostE2eSmokeRunner({
      repoPath: "/tmp/repo",
      bubbleId: "bubble-1",
      scenario: {
        id: "scenario-1",
        steps: [
          {
            kind: "pass",
            summary: "first",
            expectedStateFingerprint: "state-fp"
          }
        ]
      },
      authorityResolver: async () => authority(),
      actorEmitInvoker: vi.fn(async () => ({ ok: true }))
    });
    await runner.start({
      start: async (adapters) => {
        await adapters.launchBubbleSessionAck({
          bubbleId: "bubble-1",
          workspacePath: "/tmp/worktree",
          statusCommand: "pairflow bubble status",
          implementerCommand: "codex",
          reviewerCommand: "codex"
        });
      }
    });

    await expect(runner.advance()).rejects.toThrow(/SMOKE_AUTHORITY_MISSING/);
  });

  it("delegates fingerprint guards to actor emit when public status cannot expose the fingerprint", async () => {
    const emit = vi.fn(async () => ({ ok: true }));
    const runner = createAlmostE2eSmokeRunner({
      repoPath: "/tmp/repo",
      bubbleId: "bubble-1",
      scenario: {
        id: "scenario-1",
        steps: [
          {
            kind: "pass",
            summary: "first",
            expectedStateFingerprint: "state-fp"
          }
        ]
      },
      authorityResolver: async () =>
        authority({
          stateFingerprintGuardMode: "emit_surface"
        }),
      actorEmitInvoker: emit
    });
    await runner.start({
      start: async (adapters) => {
        await adapters.launchBubbleSessionAck({
          bubbleId: "bubble-1",
          workspacePath: "/tmp/worktree",
          statusCommand: "pairflow bubble status",
          implementerCommand: "codex",
          reviewerCommand: "codex"
        });
      }
    });

    const advance = await runner.advance();

    expect(advance.command.args).toEqual(
      expect.arrayContaining(["--expected-state-fingerprint", "state-fp"])
    );
    expect(emit).toHaveBeenCalledTimes(1);
  });

  it("rejects step kinds that do not match awaited public output type", async () => {
    const emit = vi.fn(async () => ({ ok: true }));
    const passRunner = createAlmostE2eSmokeRunner({
      repoPath: "/tmp/repo",
      bubbleId: "bubble-1",
      scenario: {
        id: "scenario-1",
        steps: [
          {
            kind: "pass",
            summary: "done"
          }
        ]
      },
      authorityResolver: async () =>
        authority({
          awaitedOutputType: "meta_review_result"
        }),
      actorEmitInvoker: emit
    });
    await passRunner.start({
      start: async (adapters) => {
        await adapters.launchBubbleSessionAck({
          bubbleId: "bubble-1",
          workspacePath: "/tmp/worktree",
          statusCommand: "pairflow bubble status",
          implementerCommand: "codex",
          reviewerCommand: "codex"
        });
      }
    });

    await expect(passRunner.advance()).rejects.toThrow(
      /SMOKE_AWAITED_OUTPUT_MISMATCH/
    );

    const metaReviewRunner = createAlmostE2eSmokeRunner({
      repoPath: "/tmp/repo",
      bubbleId: "bubble-1",
      scenario: {
        id: "scenario-1",
        steps: [
          {
            kind: "meta_review_result",
            round: 1,
            recommendation: "approve",
            summary: "approved",
            reportJson: {}
          }
        ]
      },
      authorityResolver: async () => authority(),
      actorEmitInvoker: emit
    });
    await metaReviewRunner.start({
      start: async (adapters) => {
        await adapters.launchBubbleSessionAck({
          bubbleId: "bubble-1",
          workspacePath: "/tmp/worktree",
          statusCommand: "pairflow bubble status",
          implementerCommand: "codex",
          reviewerCommand: "codex"
        });
      }
    });

    await expect(metaReviewRunner.advance()).rejects.toThrow(
      /SMOKE_AWAITED_OUTPUT_MISMATCH/
    );
    expect(emit).not.toHaveBeenCalled();
  });

  it("rejects overlapping advances instead of emitting the same step twice", async () => {
    let releaseAuthority!: () => void;
    const authorityReady = new Promise<void>((resolve) => {
      releaseAuthority = resolve;
    });
    const runner = createAlmostE2eSmokeRunner({
      repoPath: "/tmp/repo",
      bubbleId: "bubble-1",
      scenario: {
        id: "scenario-1",
        steps: [
          {
            kind: "pass",
            summary: "first"
          }
        ]
      },
      authorityResolver: vi
        .fn()
        .mockResolvedValueOnce(authority())
        .mockImplementationOnce(async () => {
          await authorityReady;
          return authority();
        }),
      actorEmitInvoker: vi.fn(async () => ({ ok: true }))
    });
    await runner.start({
      start: async (adapters) => {
        await adapters.launchBubbleSessionAck({
          bubbleId: "bubble-1",
          workspacePath: "/tmp/worktree",
          statusCommand: "pairflow bubble status",
          implementerCommand: "codex",
          reviewerCommand: "codex"
        });
      }
    });

    const firstAdvance = runner.advance();
    await expect(runner.advance()).rejects.toThrow(/SMOKE_ADVANCE_IN_FLIGHT/);
    releaseAuthority();
    await firstAdvance;
  });

  it("discovers launch metadata from injected fake adapters", async () => {
    const fakeAdapters = createFakeExternalAdapters();
    const runner = createAlmostE2eSmokeRunner({
      repoPath: "/tmp/repo",
      bubbleId: "bubble-1",
      scenario: {
        id: "scenario-1",
        steps: []
      },
      fakeAdapters,
      authorityResolver: async () => authority(),
      actorEmitInvoker: vi.fn()
    });

    await runner.start({
      start: async (adapters) => {
        await adapters.launchBubbleSessionAck({
          bubbleId: "bubble-1",
          workspacePath: "/tmp/worktree",
          statusCommand: "pairflow bubble status",
          implementerCommand: "codex",
          reviewerCommand: "codex"
        });
      }
    });

    expect(runner.snapshot().launchInput).toMatchObject({
      bubbleId: "bubble-1"
    });
  });

  it("does not discover stale launch acknowledgements from reused fake adapters", async () => {
    const fakeAdapters = createFakeExternalAdapters();
    const firstRunner = createAlmostE2eSmokeRunner({
      repoPath: "/tmp/repo",
      bubbleId: "bubble-1",
      scenario: {
        id: "scenario-1",
        steps: []
      },
      fakeAdapters,
      authorityResolver: async () => authority(),
      actorEmitInvoker: vi.fn()
    });
    await firstRunner.start({
      start: async (adapters) => {
        await adapters.launchBubbleSessionAck({
          bubbleId: "bubble-1",
          workspacePath: "/tmp/worktree",
          statusCommand: "pairflow bubble status",
          implementerCommand: "codex",
          reviewerCommand: "codex"
        });
      }
    });

    const secondRunner = createAlmostE2eSmokeRunner({
      repoPath: "/tmp/repo",
      bubbleId: "bubble-1",
      scenario: {
        id: "scenario-2",
        steps: []
      },
      fakeAdapters,
      authorityResolver: async () => authority(),
      actorEmitInvoker: vi.fn()
    });

    await expect(secondRunner.start()).rejects.toThrow(/SMOKE_LAUNCH_MISSING/);
  });

  it("rejects fake launch metadata for a different bubble", async () => {
    const runner = createAlmostE2eSmokeRunner({
      repoPath: "/tmp/repo",
      bubbleId: "bubble-1",
      scenario: {
        id: "scenario-1",
        steps: []
      },
      authorityResolver: async () => authority(),
      actorEmitInvoker: vi.fn()
    });

    await expect(
      runner.start({
        start: async (adapters) => {
          await adapters.launchBubbleSessionAck({
            bubbleId: "other-bubble",
            workspacePath: "/tmp/worktree",
            statusCommand: "pairflow bubble status",
            implementerCommand: "codex",
            reviewerCommand: "codex"
          });
        }
      })
    ).rejects.toThrow(/SMOKE_LAUNCH_BUBBLE_MISMATCH/);
  });

  it("returns snapshots that cannot mutate runner state", async () => {
    const runner = createAlmostE2eSmokeRunner({
      repoPath: "/tmp/repo",
      bubbleId: "bubble-1",
      scenario: {
        id: "scenario-1",
        steps: [
          {
            kind: "pass",
            summary: "first"
          }
        ]
      },
      authorityResolver: async () => authority(),
      actorEmitInvoker: vi.fn(async () => ({ ok: true }))
    });
    await runner.start({
      start: async (adapters) => {
        await adapters.launchBubbleSessionAck({
          bubbleId: "bubble-1",
          workspacePath: "/tmp/worktree",
          statusCommand: "pairflow bubble status",
          implementerCommand: "codex",
          reviewerCommand: "codex"
        });
      }
    });
    await runner.advance();

    const snapshot = runner.snapshot();
    snapshot.scenario.steps[0]!.label = "changed";
    snapshot.launchInput!.bubbleId = "changed";
    snapshot.launchAuthority!.handoffId = "changed";
    snapshot.advances[0]!.step.label = "changed";
    snapshot.advances[0]!.authority.handoffId = "changed";

    const freshSnapshot = runner.snapshot();
    expect(freshSnapshot.scenario.steps[0]!.label).toBeUndefined();
    expect(freshSnapshot.launchInput).toMatchObject({
      bubbleId: "bubble-1"
    });
    expect(freshSnapshot.launchAuthority).toMatchObject({
      handoffId: "handoff-1"
    });
    expect(freshSnapshot.advances[0]!.step.label).toBeUndefined();
    expect(freshSnapshot.advances[0]!.authority).toMatchObject({
      handoffId: "handoff-1"
    });
  });

  it("returns advance results that cannot mutate stored runner result state", async () => {
    const emitResult = {
      nested: {
        ok: true
      }
    };
    const runner = createAlmostE2eSmokeRunner({
      repoPath: "/tmp/repo",
      bubbleId: "bubble-1",
      scenario: {
        id: "scenario-1",
        steps: [
          {
            kind: "pass",
            summary: "first"
          }
        ]
      },
      authorityResolver: async () => authority(),
      actorEmitInvoker: vi.fn(async () => emitResult)
    });
    await runner.start({
      start: async (adapters) => {
        await adapters.launchBubbleSessionAck({
          bubbleId: "bubble-1",
          workspacePath: "/tmp/worktree",
          statusCommand: "pairflow bubble status",
          implementerCommand: "codex",
          reviewerCommand: "codex"
        });
      }
    });

    const advance = await runner.advance();
    (advance.result as typeof emitResult).nested.ok = false;
    emitResult.nested.ok = false;

    expect(runner.snapshot().advances[0]!.result).toEqual({
      nested: {
        ok: true
      }
    });
  });

  it("records successful emits with non-cloneable invoker results as advanced", async () => {
    const emit = vi.fn(async () => ({
      callback: () => "not cloneable"
    }));
    const runner = createAlmostE2eSmokeRunner({
      repoPath: "/tmp/repo",
      bubbleId: "bubble-1",
      scenario: {
        id: "scenario-1",
        steps: [
          {
            kind: "pass",
            label: "first",
            summary: "first"
          }
        ]
      },
      authorityResolver: async () => authority(),
      actorEmitInvoker: emit
    });
    await runner.start({
      start: async (adapters) => {
        await adapters.launchBubbleSessionAck({
          bubbleId: "bubble-1",
          workspacePath: "/tmp/worktree",
          statusCommand: "pairflow bubble status",
          implementerCommand: "codex",
          reviewerCommand: "codex"
        });
      }
    });

    const advance = await runner.advance("first");
    await expect(runner.advance("first")).rejects.toThrow(
      /SMOKE_STEP_ALREADY_ADVANCED/
    );

    expect(advance.result).toMatchObject({
      cloneable: false
    });
    expect(emit).toHaveBeenCalledTimes(1);
  });

  it("does not skip earlier pending steps after advancing a later label", async () => {
    const emit = vi.fn(async () => ({ ok: true }));
    const runner = createAlmostE2eSmokeRunner({
      repoPath: "/tmp/repo",
      bubbleId: "bubble-1",
      scenario: {
        id: "scenario-1",
        steps: [
          {
            kind: "pass",
            summary: "first"
          },
          {
            kind: "pass",
            label: "later",
            summary: "later"
          },
          {
            kind: "pass",
            summary: "third"
          }
        ]
      },
      authorityResolver: async () => authority(),
      actorEmitInvoker: emit
    });
    await runner.start({
      start: async (adapters) => {
        await adapters.launchBubbleSessionAck({
          bubbleId: "bubble-1",
          workspacePath: "/tmp/worktree",
          statusCommand: "pairflow bubble status",
          implementerCommand: "codex",
          reviewerCommand: "codex"
        });
      }
    });

    const labeled = await runner.advance("later");
    const next = await runner.advance();
    const third = await runner.advance();

    expect(labeled.step).toMatchObject({ summary: "later" });
    expect(next.step).toMatchObject({ summary: "first" });
    expect(third.step).toMatchObject({ summary: "third" });
    expect(emit).toHaveBeenCalledTimes(3);
  });

  it("exposes awaited output type from resolved authority snapshots", async () => {
    const runner = createAlmostE2eSmokeRunner({
      repoPath: "/tmp/repo",
      bubbleId: "bubble-1",
      scenario: {
        id: "scenario-1",
        steps: []
      },
      authorityResolver: async () =>
        authority({
          awaitedOutputType: "meta_review_result"
        }),
      actorEmitInvoker: vi.fn()
    });

    await runner.start({
      start: async (adapters) => {
        await adapters.launchBubbleSessionAck({
          bubbleId: "bubble-1",
          workspacePath: "/tmp/worktree",
          statusCommand: "pairflow bubble status",
          implementerCommand: "codex",
          reviewerCommand: "codex"
        });
      }
    });

    expect(runner.snapshot().launchAuthority).toMatchObject({
      awaitedOutputType: "meta_review_result"
    });
  });

  it("rejects incomplete fake launch metadata", async () => {
    const runner = createAlmostE2eSmokeRunner({
      repoPath: "/tmp/repo",
      bubbleId: "bubble-1",
      scenario: {
        id: "scenario-1",
        steps: []
      },
      authorityResolver: async () => authority(),
      actorEmitInvoker: vi.fn()
    });

    await expect(
      runner.start({
        start: async (adapters) => {
          await adapters.launchBubbleSessionAck({
            bubbleId: "bubble-1"
          } as never);
        }
      })
    ).rejects.toThrow(/SMOKE_LAUNCH_INCOMPLETE/);
  });

  it("uses fake process spawn for the default actor emit path", async () => {
    const runner = createAlmostE2eSmokeRunner({
      repoPath: "/tmp/repo",
      bubbleId: "bubble-1",
      scenario: {
        id: "scenario-1",
        steps: [
          {
            kind: "pass",
            summary: "done"
          }
        ]
      },
      authorityResolver: async () => authority()
    });

    await runner.start({
      start: async (adapters) => {
        await adapters.launchBubbleSessionAck({
          bubbleId: "bubble-1",
          workspacePath: "/tmp/worktree",
          statusCommand: "pairflow bubble status",
          implementerCommand: "codex",
          reviewerCommand: "codex"
        });
      }
    });
    const advance = await runner.advance();
    const processSpawn = advance.sideEffects.processSpawns[0];

    expect(advance.result).toEqual({ exitCode: 0 });
    expect(advance.sideEffects.processSpawns).toHaveLength(1);
    expect(processSpawn?.command).toBe("pairflow");
    expect(processSpawn?.args).toEqual(
      expect.arrayContaining(["agent", "emit", "--kind", "pass"])
    );
  });

  it("fails and keeps the step pending when default actor emit exits nonzero", async () => {
    const fakeAdapters = createFakeExternalAdapters({ processExitCode: 1 });
    const runner = createAlmostE2eSmokeRunner({
      repoPath: "/tmp/repo",
      bubbleId: "bubble-1",
      scenario: {
        id: "scenario-1",
        steps: [
          {
            kind: "pass",
            summary: "done"
          }
        ]
      },
      fakeAdapters,
      authorityResolver: async () => authority()
    });

    await runner.start({
      start: async (adapters) => {
        await adapters.launchBubbleSessionAck({
          bubbleId: "bubble-1",
          workspacePath: "/tmp/worktree",
          statusCommand: "pairflow bubble status",
          implementerCommand: "codex",
          reviewerCommand: "codex"
        });
      }
    });

    await expect(runner.advance()).rejects.toThrow(/SMOKE_ACTOR_EMIT_FAILED/);

    expect(runner.snapshot().advances).toHaveLength(0);
    expect(runner.snapshot().sideEffects.processSpawns).toHaveLength(1);
  });

  it("fails the default actor emit path when process close has no exit code", async () => {
    const fakeAdapters = createFakeExternalAdapters({ processExitCode: null });
    const runner = createAlmostE2eSmokeRunner({
      repoPath: "/tmp/repo",
      bubbleId: "bubble-1",
      scenario: {
        id: "scenario-1",
        steps: [
          {
            kind: "pass",
            summary: "done"
          }
        ]
      },
      fakeAdapters,
      authorityResolver: async () => authority()
    });

    await runner.start({
      start: async (adapters) => {
        await adapters.launchBubbleSessionAck({
          bubbleId: "bubble-1",
          workspacePath: "/tmp/worktree",
          statusCommand: "pairflow bubble status",
          implementerCommand: "codex",
          reviewerCommand: "codex"
        });
      }
    });

    await expect(runner.advance()).rejects.toThrow(/no exit code/);
    expect(runner.snapshot().advances).toHaveLength(0);
  });
});
