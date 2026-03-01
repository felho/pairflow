import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createBubble } from "../../../src/core/bubble/createBubble.js";
import { emitPassFromWorkspace, PassCommandError } from "../../../src/core/agent/pass.js";
import { readStateSnapshot, writeStateSnapshot } from "../../../src/core/state/stateStore.js";
import { bootstrapWorktreeWorkspace } from "../../../src/core/workspace/worktreeManager.js";
import { readTranscriptEnvelopes } from "../../../src/core/protocol/transcriptStore.js";
import { initGitRepository } from "../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-pass-command-"));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("emitPassFromWorkspace", () => {
  it("writes PASS envelope and switches active role with inferred intent", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_01",
      task: "Implement pass flow"
    });
    const now = new Date("2026-02-21T12:05:00.000Z");

    const result = await emitPassFromWorkspace({
      summary: "Implementation complete",
      refs: ["artifact://diff/round-1.patch"],
      cwd: bubble.paths.worktreePath,
      now
    });

    expect(result.bubbleId).toBe("b_pass_01");
    expect(result.sequence).toBe(2);
    expect(result.inferredIntent).toBe(true);
    expect(result.envelope.type).toBe("PASS");
    expect(result.envelope.round).toBe(1);
    expect(result.envelope.sender).toBe("codex");
    expect(result.envelope.recipient).toBe("claude");
    expect(result.envelope.payload.pass_intent).toBe("review");

    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcript.map((entry) => entry.type)).toEqual([
      "TASK",
      "PASS"
    ]);

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    expect(loaded.state.active_agent).toBe("claude");
    expect(loaded.state.active_role).toBe("reviewer");
    expect(loaded.state.round).toBe(1);
    expect(loaded.state.last_command_at).toBe(now.toISOString());
  });

  it("uses explicit intent override", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_02",
      task: "Implement pass flow"
    });

    const result = await emitPassFromWorkspace({
      summary: "Please continue",
      intent: "task",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-21T12:05:00.000Z")
    });

    expect(result.inferredIntent).toBe(false);
    expect(result.envelope.payload.pass_intent).toBe("task");
  });

  it("increments round when reviewer passes back to implementer", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_03",
      task: "Implement pass flow"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 1,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-02-21T12:06:00.000Z",
        last_command_at: "2026-02-21T12:06:00.000Z"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const now = new Date("2026-02-21T12:07:00.000Z");
    const result = await emitPassFromWorkspace({
      summary: "Found issues to fix",
      findings: [
        {
          severity: "P2",
          title: "Improve null checks"
        }
      ],
      cwd: bubble.paths.worktreePath,
      now
    });

    expect(result.envelope.sender).toBe("claude");
    expect(result.envelope.recipient).toBe("codex");
    expect(result.envelope.round).toBe(1);
    expect(result.inferredIntent).toBe(true);
    expect(result.envelope.payload.pass_intent).toBe("fix_request");

    const updated = await readStateSnapshot(bubble.paths.statePath);
    expect(updated.state.round).toBe(2);
    expect(updated.state.active_agent).toBe("codex");
    expect(updated.state.active_role).toBe("implementer");
    expect(updated.state.round_role_history.some((entry) => entry.round === 2)).toBe(true);
  });

  it("requires explicit findings declaration for reviewer PASS", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_06",
      task: "Implement pass flow"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 1,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-02-21T12:06:00.000Z",
        last_command_at: "2026-02-21T12:06:00.000Z"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    await expect(
      emitPassFromWorkspace({
        summary: "Review done",
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/requires explicit findings declaration/u);
  });

  it("writes empty findings array when reviewer declares no findings", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_07",
      task: "Implement pass flow"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 1,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-02-21T12:06:00.000Z",
        last_command_at: "2026-02-21T12:06:00.000Z"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const result = await emitPassFromWorkspace({
      summary: "Review clean",
      noFindings: true,
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-21T12:07:00.000Z")
    });

    expect(result.inferredIntent).toBe(true);
    expect(result.envelope.payload.pass_intent).toBe("review");
    expect(result.envelope.payload.findings).toEqual([]);
  });

  it("rejects reviewer P1 findings without finding-level evidence refs", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_19",
      task: "Implement pass flow"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 1,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-02-21T12:06:00.000Z",
        last_command_at: "2026-02-21T12:06:00.000Z"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    await expect(
      emitPassFromWorkspace({
        summary: "Blocking issue found",
        findings: [
          {
            severity: "P1",
            title: "Race condition"
          }
        ],
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/P0\/P1 findings requires explicit finding-level evidence refs/u);
  });

  it("rejects reviewer P0 findings without finding-level evidence refs", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_22",
      task: "Implement pass flow"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 1,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-02-21T12:06:00.000Z",
        last_command_at: "2026-02-21T12:06:00.000Z"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    await expect(
      emitPassFromWorkspace({
        summary: "Critical blocker found",
        findings: [
          {
            severity: "P0",
            title: "Data loss risk"
          }
        ],
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/P0\/P1 findings requires explicit finding-level evidence refs/u);
  });

  it("accepts reviewer P1 findings with explicit finding-level refs", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_20",
      task: "Implement pass flow"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 1,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-02-21T12:06:00.000Z",
        last_command_at: "2026-02-21T12:06:00.000Z"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const result = await emitPassFromWorkspace({
      summary: "Blocking issue found",
      findings: [
        {
          severity: "P1",
          title: "Race condition",
          refs: ["artifact://review/p1-proof.md"]
        }
      ],
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-21T12:07:00.000Z")
    });

    expect(result.inferredIntent).toBe(true);
    expect(result.envelope.payload.pass_intent).toBe("fix_request");
    expect(result.envelope.payload.findings).toEqual([
      {
        severity: "P1",
        title: "Race condition",
        refs: ["artifact://review/p1-proof.md"]
      }
    ]);
  });

  it("rejects blocker findings when only envelope refs are provided", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_23",
      task: "Implement pass flow"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 1,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-02-21T12:06:00.000Z",
        last_command_at: "2026-02-21T12:06:00.000Z"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    await expect(
      emitPassFromWorkspace({
        summary: "Blocking findings with envelope refs only",
        findings: [
          {
            severity: "P1",
            title: "Race condition"
          },
          {
            severity: "P0",
            title: "Data loss risk"
          }
        ],
        refs: ["artifact://review/blocker-proof.md"],
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/P0\/P1 findings requires explicit finding-level evidence refs/u);
  });

  it("rejects mixed blocker findings when one finding is missing refs and no envelope refs are present", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_24",
      task: "Implement pass flow"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 1,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-02-21T12:06:00.000Z",
        last_command_at: "2026-02-21T12:06:00.000Z"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    await expect(
      emitPassFromWorkspace({
        summary: "Mixed blocker evidence",
        findings: [
          {
            severity: "P1",
            title: "Race condition",
            refs: ["artifact://review/p1-proof.md"]
          },
          {
            severity: "P0",
            title: "Data loss risk"
          }
        ],
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/P0\/P1 findings requires explicit finding-level evidence refs/u);
  });

  it("accepts reviewer P2/P3 findings without refs", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_21",
      task: "Implement pass flow"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 1,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-02-21T12:06:00.000Z",
        last_command_at: "2026-02-21T12:06:00.000Z"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const result = await emitPassFromWorkspace({
      summary: "Non-blocking findings only",
      findings: [
        {
          severity: "P2",
          title: "Missing edge-case test"
        },
        {
          severity: "P3",
          title: "Naming cleanup"
        }
      ],
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-21T12:07:00.000Z")
    });

    expect(result.inferredIntent).toBe(true);
    expect(result.envelope.payload.pass_intent).toBe("fix_request");
    expect(result.envelope.payload.findings).toEqual([
      {
        severity: "P2",
        title: "Missing edge-case test"
      },
      {
        severity: "P3",
        title: "Naming cleanup"
      }
    ]);
  });

  it("rejects reviewer fix_request intent when --no-findings is declared", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_10",
      task: "Implement pass flow"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 1,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-02-21T12:06:00.000Z",
        last_command_at: "2026-02-21T12:06:00.000Z"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    await expect(
      emitPassFromWorkspace({
        summary: "Review clean",
        noFindings: true,
        intent: "fix_request",
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/--no-findings cannot use intent=fix_request/u);
  });

  it("rejects reviewer review intent when findings are declared", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_11",
      task: "Implement pass flow"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 1,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-02-21T12:06:00.000Z",
        last_command_at: "2026-02-21T12:06:00.000Z"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    await expect(
      emitPassFromWorkspace({
        summary: "Review has findings",
        findings: [
          {
            severity: "P1",
            title: "Blocking issue",
            refs: ["artifact://review/p1-proof.md"]
          }
        ],
        intent: "review",
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/findings cannot use intent=review/u);
  });

  it("accepts reviewer explicit review intent with --no-findings", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_12",
      task: "Implement pass flow"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 1,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-02-21T12:06:00.000Z",
        last_command_at: "2026-02-21T12:06:00.000Z"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const result = await emitPassFromWorkspace({
      summary: "Review clean explicit intent",
      noFindings: true,
      intent: "review",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-21T12:07:00.000Z")
    });

    expect(result.inferredIntent).toBe(false);
    expect(result.envelope.payload.pass_intent).toBe("review");
    expect(result.envelope.payload.findings).toEqual([]);
  });

  it("does not attach reviewer test directive metadata on reviewer PASS", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_18",
      task: "Implement pass flow"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 1,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-02-21T12:06:00.000Z",
        last_command_at: "2026-02-21T12:06:00.000Z"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    let capturedDirective:
      | {
          skip_full_rerun: boolean;
          reason_code: string;
        }
      | undefined;
    await emitPassFromWorkspace(
      {
        summary: "Review complete",
        noFindings: true,
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-21T12:07:00.000Z")
      },
      {
        emitTmuxDeliveryNotification: (input) => {
          capturedDirective = input.reviewerTestDirective;
          return Promise.resolve({
            delivered: true,
            message: "ok"
          });
        }
      }
    );

    expect(capturedDirective).toBeUndefined();
  });

  it("accepts reviewer explicit fix_request intent with findings", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_13",
      task: "Implement pass flow"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 1,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-02-21T12:06:00.000Z",
        last_command_at: "2026-02-21T12:06:00.000Z"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const findings = [
      {
        severity: "P2" as const,
        title: "Needs follow-up"
      }
    ];
    const result = await emitPassFromWorkspace({
      summary: "Review findings explicit intent",
      findings,
      intent: "fix_request",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-21T12:07:00.000Z")
    });

    expect(result.inferredIntent).toBe(false);
    expect(result.envelope.payload.pass_intent).toBe("fix_request");
    expect(result.envelope.payload.findings).toEqual(findings);
  });

  it("rejects reviewer task intent with --no-findings", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_14",
      task: "Implement pass flow"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 1,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-02-21T12:06:00.000Z",
        last_command_at: "2026-02-21T12:06:00.000Z"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    await expect(
      emitPassFromWorkspace({
        summary: "Reviewer should not use task intent",
        noFindings: true,
        intent: "task",
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/Reviewer PASS cannot use intent=task/u);
  });

  it("rejects reviewer task intent with explicit findings", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_15",
      task: "Implement pass flow"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 1,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-02-21T12:06:00.000Z",
        last_command_at: "2026-02-21T12:06:00.000Z"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    await expect(
      emitPassFromWorkspace({
        summary: "Reviewer should not use task intent",
        findings: [
          {
            severity: "P2",
            title: "Needs follow-up"
          }
        ],
        intent: "task",
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/Reviewer PASS cannot use intent=task/u);
  });

  it("rejects findings flags on implementer PASS", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_08",
      task: "Implement pass flow"
    });

    await expect(
      emitPassFromWorkspace({
        summary: "Implementation done",
        noFindings: true,
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/Implementer PASS does not accept findings flags/u);
  });

  it("refreshes reviewer pane on implementer PASS when reviewer context mode is fresh", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_09",
      task: "Implement pass flow"
    });

    const refreshCalls: Array<{ bubbleId: string }> = [];
    await emitPassFromWorkspace(
      {
        summary: "Implementation complete",
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-21T12:05:00.000Z")
      },
      {
        refreshReviewerContext: ({ bubbleId }) => {
          refreshCalls.push({ bubbleId });
          return Promise.resolve({
            refreshed: true
          });
        }
      }
    );

    expect(refreshCalls).toEqual([{ bubbleId: "b_pass_09" }]);
  });

  it("writes reviewer test-evidence verification artifact for implementer PASS", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_16",
      task: "Implement pass flow"
    });

    const evidenceLogPath = join(
      bubble.paths.worktreePath,
      "evidence.log"
    );
    await writeFile(
      evidenceLogPath,
      "pnpm typecheck exit=0 found 0 errors\npnpm test exit=0 406 tests passed\n",
      "utf8"
    );

    await emitPassFromWorkspace({
      summary: "Validation complete",
      refs: [evidenceLogPath],
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-21T12:05:00.000Z")
    });

    const rawArtifact = await readFile(
      join(bubble.paths.artifactsDir, "reviewer-test-verification.json"),
      "utf8"
    );
    const artifact = JSON.parse(rawArtifact) as {
      status: string;
      decision: string;
      reason_code: string;
    };

    expect(artifact.status).toBe("trusted");
    expect(artifact.decision).toBe("skip_full_rerun");
    expect(artifact.reason_code).toBe("no_trigger");
  });

  it("falls back to run_checks reviewer directive when artifact write fails", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_17",
      task: "Implement pass flow"
    });

    await rm(bubble.paths.artifactsDir, { recursive: true, force: true });
    await writeFile(bubble.paths.artifactsDir, "blocked", "utf8");

    const evidenceLogPath = join(
      bubble.paths.worktreePath,
      "evidence.log"
    );
    await writeFile(
      evidenceLogPath,
      "pnpm typecheck exit=0 found 0 errors\npnpm test exit=0 406 tests passed\n",
      "utf8"
    );

    let capturedDirective:
      | {
          skip_full_rerun: boolean;
          reason_code: string;
        }
      | undefined;
    await emitPassFromWorkspace(
      {
        summary: "Validation complete",
        refs: [evidenceLogPath],
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-21T12:05:00.000Z")
      },
      {
        emitTmuxDeliveryNotification: (input) => {
          capturedDirective = input.reviewerTestDirective;
          return Promise.resolve({
            delivered: true,
            message: "ok"
          });
        }
      }
    );

    expect(capturedDirective?.skip_full_rerun).toBe(false);
    expect(capturedDirective?.reason_code).toBe("evidence_unverifiable");
  });

  it("rejects pass when bubble is not running", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_pass_04",
      repoPath,
      baseBranch: "main",
      task: "Task",
      cwd: repoPath
    });

    await bootstrapWorktreeWorkspace({
      repoPath,
      baseBranch: "main",
      bubbleBranch: bubble.config.bubble_branch,
      worktreePath: bubble.paths.worktreePath
    });

    await expect(
      emitPassFromWorkspace({
        summary: "Should fail",
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toBeInstanceOf(PassCommandError);
  });

  it("rejects RUNNING state when round is invalid", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_pass_05",
      task: "Implement pass flow"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: 0
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    await expect(
      emitPassFromWorkspace({
        summary: "Invalid round",
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toThrow(/round >= 1/u);
  });
});
