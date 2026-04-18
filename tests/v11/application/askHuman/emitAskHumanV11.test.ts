import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  asAskHumanCommandErrorV11,
  AskHumanCommandErrorV11,
  emitAskHumanFromWorkspaceV11
} from "../../../../src/v11/application/askHuman/emitAskHumanV11.js";
import { WorkspaceResolutionError } from "../../../../src/v11/infrastructure/executor/workspace/workspaceResolution.js";
import { createBubble } from "../../../../src/v11/application/create/createCommandApi.js";
import { bootstrapWorktreeWorkspace } from "../../../../src/v11/infrastructure/workspace/worktreeManager.js";
import { readStateSnapshot } from "../../../../src/v11/infrastructure/state/stateStore.js";
import { readTranscriptEnvelopes } from "../../../../src/v11/infrastructure/artifact/transcript/transcriptStore.js";
import { initGitRepository } from "../../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../../helpers/bubble.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-ask-human-v11-"));
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

describe("emitAskHumanFromWorkspaceV11", () => {
  it("writes HUMAN_QUESTION to transcript + inbox and transitions to WAITING_HUMAN", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_ask_human_v11_01",
      task: "Need clarification"
    });
    const authorityBeforeEmit = await readStateSnapshot(bubble.paths.statePath);
    const now = new Date("2026-02-21T12:10:00.000Z");

    const result = await emitAskHumanFromWorkspaceV11({
      question: "Should we keep backwards compatibility?",
      refs: ["artifact://analysis/risk.md"],
      cwd: bubble.paths.worktreePath,
      now
    });

    expect(result.sequence).toBe(2);
    expect(result.envelope.type).toBe("HUMAN_QUESTION");
    expect(result.envelope.sender).toBe("codex");
    expect(result.envelope.recipient).toBe("human");
    expect(result.state.state).toBe("WAITING_HUMAN");
    expect(result.activation).toEqual({
      handoff_id: authorityBeforeEmit.state.execution_context?.handoff_id,
      execution_id: authorityBeforeEmit.state.execution_context?.execution_id,
      expected_role: authorityBeforeEmit.state.execution_context?.active_role,
      expected_round: authorityBeforeEmit.state.execution_context?.round,
      expected_state_fingerprint: authorityBeforeEmit.fingerprint
    });
    expect(result.delivery).toMatchObject({
      delivered: false,
      reason: "no_runtime_session",
      deliveryTargetReasonCode: "DELIVERY_TARGET_ROLE_ABSENT"
    });
    expect(result.delivery?.message).toContain("HUMAN_QUESTION codex->human");

    const state = await readStateSnapshot(bubble.paths.statePath);
    expect(state.state.state).toBe("WAITING_HUMAN");
    expect(state.state.active_agent).toBe("codex");
    expect(state.state.active_role).toBe("implementer");
    expect(state.state.last_command_at).toBe(now.toISOString());

    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcript.map((entry) => entry.type)).toEqual([
      "TASK",
      "HUMAN_QUESTION"
    ]);

    const inbox = await readTranscriptEnvelopes(bubble.paths.inboxPath);
    expect(inbox).toHaveLength(1);
    expect(inbox[0]?.type).toBe("HUMAN_QUESTION");
  });

  it("rejects when bubble is not RUNNING", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_ask_human_v11_02",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Task",
      cwd: repoPath
    });

    await bootstrapWorktreeWorkspace({
      repoPath,
      baseBranch: "main",
      bubbleBranch: bubble.config.bubble_branch,
      worktreePath: bubble.paths.worktreePath,
      workspaceKind: "worktree"
    });

    await expect(
      emitAskHumanFromWorkspaceV11({
        question: "Need human input",
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toBeInstanceOf(AskHumanCommandErrorV11);
  });

  it("forwards optional notification dependencies through v11 wrapper", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_ask_human_v11_03",
      task: "Need delivery passthrough ref"
    });

    const deliveryRefs: string[] = [];
    const result = await emitAskHumanFromWorkspaceV11(
      {
        question: "Need operator input",
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-21T12:11:00.000Z")
      },
      {
        emitTmuxDeliveryNotification: (input) => {
          if (input.messageRef === undefined) {
            throw new Error("Expected messageRef for HUMAN_QUESTION delivery.");
          }
          deliveryRefs.push(input.messageRef);
          return Promise.resolve({
            status: "accepted",
            delivered: true,
            message: "ok",
            sessionName: "pf_bubble",
            targetPaneIndex: 1
          });
        },
        emitBubbleNotification: () =>
          Promise.resolve({
            kind: "waiting-human",
            attempted: false,
            delivered: false,
            soundPath: null,
            reason: "disabled"
          })
      }
    );

    expect(deliveryRefs).toEqual([
      `${bubble.paths.transcriptPath}#${result.envelope.id}`
    ]);
    expect(deliveryRefs[0]?.startsWith("transcript.ndjson#")).toBe(false);
    expect(result.delivery).toMatchObject({
      status: "accepted",
      delivered: true,
      message: "ok"
    });
  });
});

describe("asAskHumanCommandErrorV11", () => {
  it("rethrows AskHumanCommandErrorV11 instances as-is", () => {
    const original = new AskHumanCommandErrorV11("already normalized");
    expect(() => asAskHumanCommandErrorV11(original)).toThrow(original);
  });

  it("maps WorkspaceResolutionError to AskHumanCommandErrorV11", () => {
    expect(() =>
      asAskHumanCommandErrorV11(
        new WorkspaceResolutionError("workspace lookup failed")
      )
    ).toThrowError(AskHumanCommandErrorV11);
  });

  it("maps generic Error to AskHumanCommandErrorV11", () => {
    expect(() => asAskHumanCommandErrorV11(new Error("unexpected"))).toThrowError(
      AskHumanCommandErrorV11
    );
  });

  it("rethrows non-Error values unchanged", () => {
    expect(() => asAskHumanCommandErrorV11("raw-error")).toThrow("raw-error");
  });
});
