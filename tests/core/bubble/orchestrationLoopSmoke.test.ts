import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { emitConvergedFromWorkspace } from "../../../src/core/agent/converged.js";
import { emitPassFromWorkspace } from "../../../src/core/agent/pass.js";
import { createBubble } from "../../../src/core/bubble/createBubble.js";
import { startBubble } from "../../../src/core/bubble/startBubble.js";
import { readTranscriptEnvelopes } from "../../../src/core/protocol/transcriptStore.js";
import { readStateSnapshot } from "../../../src/core/state/stateStore.js";
import type { ProtocolEnvelope } from "../../../src/types/protocol.js";
import { initGitRepository } from "../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";

const tempDirs: string[] = [];

interface DeliveryCall {
  bubbleId: string;
  recipient: ProtocolEnvelope["recipient"];
  type: ProtocolEnvelope["type"];
}

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-orchestration-smoke-"));
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

describe("bubble orchestration loop smoke", () => {
  it("covers startup, handoff, and loop completion in one smoke scenario", async () => {
    const repoPath = await createTempRepo();
    const startupBubble = await createBubble({
      id: "b_orch_smoke_01",
      repoPath,
      baseBranch: "main",
      task: "Validate startup path with isolated bootstrap",
      cwd: repoPath
    });

    const bootstrapCalls: Array<{ bubbleBranch: string; worktreePath: string }> = [];
    const tmuxAliveChecks: string[] = [];
    const runtimeClaimCalls: string[] = [];
    const runtimeRemoveCalls: string[] = [];
    let startupLaunch:
      | {
          implementerCommand: string;
          reviewerCommand: string;
          implementerKickoffMessage?: string;
        }
      | undefined;

    const startResult = await startBubble(
      {
        bubbleId: startupBubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-27T10:00:00.000Z")
      },
      {
        bootstrapWorktreeWorkspace: (input) => {
          bootstrapCalls.push({
            bubbleBranch: input.bubbleBranch,
            worktreePath: input.worktreePath
          });
          return Promise.resolve({
            repoPath: input.repoPath,
            baseRef: "refs/heads/main",
            bubbleBranch: input.bubbleBranch,
            worktreePath: input.worktreePath
          });
        },
        launchBubbleTmuxSession: (input) => {
          startupLaunch = {
            implementerCommand: input.implementerCommand,
            reviewerCommand: input.reviewerCommand,
            ...(input.implementerKickoffMessage !== undefined
              ? { implementerKickoffMessage: input.implementerKickoffMessage }
              : {})
          };
          return Promise.resolve({ sessionName: "pf-b_orch_smoke_01" });
        },
        isTmuxSessionAlive: (sessionName) => {
          tmuxAliveChecks.push(sessionName);
          return Promise.resolve(false);
        },
        claimRuntimeSession: (input) => {
          runtimeClaimCalls.push(input.bubbleId);
          return Promise.resolve({
            claimed: true,
            record: {
              bubbleId: input.bubbleId,
              repoPath: input.repoPath,
              worktreePath: input.worktreePath,
              tmuxSessionName: input.tmuxSessionName,
              updatedAt: "2026-02-27T10:00:00.000Z"
            }
          });
        },
        removeRuntimeSession: (input) => {
          runtimeRemoveCalls.push(input.bubbleId);
          return Promise.resolve(true);
        }
      }
    );

    expect(startResult.state.state).toBe("RUNNING");
    expect(startResult.state.round).toBe(1);
    expect(startResult.state.active_role).toBe("implementer");
    expect(startResult.tmuxSessionName).toBe("pf-b_orch_smoke_01");
    expect(bootstrapCalls).toEqual([
      {
        bubbleBranch: startupBubble.config.bubble_branch,
        worktreePath: startupBubble.paths.worktreePath
      }
    ]);
    expect(runtimeClaimCalls).toEqual([startupBubble.bubbleId]);
    expect(tmuxAliveChecks).toEqual([]);
    expect(runtimeRemoveCalls).toEqual([]);
    expect(startupLaunch).toBeDefined();
    expect(startupLaunch?.implementerCommand).toContain("Pairflow implementer start");
    expect(startupLaunch?.reviewerCommand).toContain("Pairflow reviewer start");
    expect(startupLaunch?.implementerKickoffMessage).toBeDefined();
    expect(startupLaunch?.implementerKickoffMessage).toContain("kickoff");

    const loopBubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_orch_smoke_loop_01",
      task: "Validate handoff + converge loop"
    });

    const passDeliveryCalls: DeliveryCall[] = [];
    const emitDelivery = (envelope: ProtocolEnvelope) => {
      passDeliveryCalls.push({
        bubbleId: loopBubble.bubbleId,
        recipient: envelope.recipient,
        type: envelope.type
      });
      return Promise.resolve({
        delivered: true,
        sessionName: `pf-${loopBubble.bubbleId}`,
        message: "ok"
      });
    };

    const passOne = await emitPassFromWorkspace(
      {
        summary: "Implementer handoff round 1",
        cwd: loopBubble.paths.worktreePath,
        now: new Date("2026-02-27T10:01:00.000Z")
      },
      {
        emitTmuxDeliveryNotification: ({ envelope }) => emitDelivery(envelope),
        refreshReviewerContext: () => Promise.resolve({ refreshed: false })
      }
    );
    expect(passOne.state.round).toBe(1);
    expect(passOne.state.active_role).toBe("reviewer");
    expect(passOne.state.active_agent).toBe(loopBubble.config.agents.reviewer);

    const passTwo = await emitPassFromWorkspace(
      {
        summary: "Reviewer clean handoff round 1",
        noFindings: true,
        cwd: loopBubble.paths.worktreePath,
        now: new Date("2026-02-27T10:02:00.000Z")
      },
      {
        emitTmuxDeliveryNotification: ({ envelope }) => emitDelivery(envelope),
        refreshReviewerContext: () => Promise.resolve({ refreshed: false })
      }
    );
    expect(passTwo.state.round).toBe(2);
    expect(passTwo.state.active_role).toBe("implementer");
    expect(passTwo.state.active_agent).toBe(loopBubble.config.agents.implementer);

    const passThree = await emitPassFromWorkspace(
      {
        summary: "Implementer handoff round 2",
        cwd: loopBubble.paths.worktreePath,
        now: new Date("2026-02-27T10:03:00.000Z")
      },
      {
        emitTmuxDeliveryNotification: ({ envelope }) => emitDelivery(envelope),
        refreshReviewerContext: () => Promise.resolve({ refreshed: false })
      }
    );
    expect(passThree.state.round).toBe(2);
    expect(passThree.state.active_role).toBe("reviewer");
    expect(passThree.state.active_agent).toBe(loopBubble.config.agents.reviewer);

    const convergenceDeliveryCalls: DeliveryCall[] = [];
    const bubbleNotificationKinds: string[] = [];
    const converged = await emitConvergedFromWorkspace(
      {
        summary: "Loop complete and ready for approval",
        refs: ["artifact://done-package.md"],
        cwd: loopBubble.paths.worktreePath,
        now: new Date("2026-02-27T10:04:00.000Z")
      },
      {
        emitTmuxDeliveryNotification: ({ envelope }) => {
          convergenceDeliveryCalls.push({
            bubbleId: loopBubble.bubbleId,
            recipient: envelope.recipient,
            type: envelope.type
          });
          return Promise.resolve({
            delivered: true,
            sessionName: `pf-${loopBubble.bubbleId}`,
            message: `${envelope.type}:${envelope.recipient}`
          });
        },
        emitBubbleNotification: (_config, kind) => {
          bubbleNotificationKinds.push(kind);
          return Promise.resolve({
            kind,
            attempted: false,
            delivered: false,
            soundPath: null,
            reason: "disabled"
          });
        }
      }
    );

    expect(converged.state.state).toBe("READY_FOR_APPROVAL");

    const transcript = await readTranscriptEnvelopes(loopBubble.paths.transcriptPath);
    expect(transcript.map((entry) => entry.type)).toEqual([
      "TASK",
      "PASS",
      "PASS",
      "PASS",
      "CONVERGENCE",
      "APPROVAL_REQUEST"
    ]);

    const loadedState = await readStateSnapshot(loopBubble.paths.statePath);
    expect(loadedState.state.state).toBe("READY_FOR_APPROVAL");
    expect(loadedState.state.active_role).toBe("reviewer");
    expect(loadedState.state.active_agent).toBe(loopBubble.config.agents.reviewer);

    expect(passDeliveryCalls).toEqual([
      {
        bubbleId: loopBubble.bubbleId,
        recipient: loopBubble.config.agents.reviewer,
        type: "PASS"
      },
      {
        bubbleId: loopBubble.bubbleId,
        recipient: loopBubble.config.agents.implementer,
        type: "PASS"
      },
      {
        bubbleId: loopBubble.bubbleId,
        recipient: loopBubble.config.agents.reviewer,
        type: "PASS"
      }
    ]);
    expect(convergenceDeliveryCalls).toEqual([
      {
        bubbleId: loopBubble.bubbleId,
        recipient: "human",
        type: "APPROVAL_REQUEST"
      },
      {
        bubbleId: loopBubble.bubbleId,
        recipient: loopBubble.config.agents.implementer,
        type: "APPROVAL_REQUEST"
      },
      {
        bubbleId: loopBubble.bubbleId,
        recipient: loopBubble.config.agents.reviewer,
        type: "APPROVAL_REQUEST"
      }
    ]);
    expect(bubbleNotificationKinds).toEqual(["converged"]);
  });
});
