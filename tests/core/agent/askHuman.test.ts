import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  asAskHumanCommandError,
  emitAskHumanFromWorkspace,
  AskHumanCommandError
} from "../../../src/v11/application/askHuman/askHumanCommandApi.js";
import { createBubble } from "../../../src/v11/defaults/create/createBubbleApi.js";
import { WorkspaceResolutionError } from "../../../src/v11/infrastructure/executor/workspace/workspaceResolution.js";
import { readTranscriptEnvelopes } from "../../../src/v11/infrastructure/artifact/transcript/transcriptStore.js";
import { readStateSnapshot } from "../../../src/v11/infrastructure/state/stateStore.js";
import { bootstrapWorktreeWorkspace } from "../../../src/v11/infrastructure/workspace/worktreeManager.js";
import { initGitRepository } from "../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { buildBubbleStateSnapshotVariant } from "../../../src/v11/domain/state/snapshot/buildBubbleStateSnapshot.js";
const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-ask-human-"));
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

async function withPatchedAskHumanWorkspaceLoadedState<T>(input: {
  statePath: string;
  mutate: (
    loaded: Awaited<ReturnType<typeof readStateSnapshot>>
  ) => Awaited<ReturnType<typeof readStateSnapshot>>;
  run: (
    dependencies: NonNullable<
      Parameters<typeof emitAskHumanFromWorkspace>[1]
    >
  ) => Promise<T>;
}): Promise<T> {
  const originalReadStateSnapshot = readStateSnapshot;
  const patchedReadStateSnapshot: typeof readStateSnapshot = async (statePath) => {
    const loaded = await originalReadStateSnapshot(statePath);
    if (statePath !== input.statePath) {
      return loaded;
    }
    return input.mutate(loaded);
  };

  return input.run({
    readStateSnapshot: patchedReadStateSnapshot
  });
}

describe("emitAskHumanFromWorkspace", () => {
  it("writes HUMAN_QUESTION to transcript + inbox and transitions to WAITING_HUMAN", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_ask_human_01",
      task: "Need clarification"
    });
    const authorityBeforeEmit = await readStateSnapshot(bubble.paths.statePath);
    const now = new Date("2026-02-21T12:10:00.000Z");

    const result = await emitAskHumanFromWorkspace({
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

    const state = await readStateSnapshot(bubble.paths.statePath);
    expect(state.state.state).toBe("WAITING_HUMAN");
    expect(state.state.active_agent).toBe("codex");
    expect(state.state.active_role).toBe("implementer");
    expect(state.state.execution_context).toBeNull();
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

  it("omits activation on the public ask-human result when the loaded execution context has blank execution_id", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_ask_human_blank_execution_id_01",
      task: "Need clarification with blank execution_id fallback"
    });

    const result = await withPatchedAskHumanWorkspaceLoadedState({
      statePath: bubble.paths.statePath,
      mutate: (loaded) => ({
        ...loaded,
        state: {
          ...loaded.state,
          execution_context: {
            ...loaded.state.execution_context,
            execution_id: "   "
          } as never
        }
      }),
      run: (dependencies) => emitAskHumanFromWorkspace(
        {
          question: "Should we keep backwards compatibility?",
          cwd: bubble.paths.worktreePath,
          now: new Date("2026-02-21T12:10:00.000Z")
        },
        dependencies
      )
    });

    expect(result.envelope.type).toBe("HUMAN_QUESTION");
    expect(result.state.state).toBe("WAITING_HUMAN");
    expect(result.activation).toBeUndefined();
  });

  it("omits activation on the public ask-human result when the loaded execution context is missing execution_id", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_ask_human_missing_execution_id_01",
      task: "Need clarification with missing execution_id fallback"
    });

    const result = await withPatchedAskHumanWorkspaceLoadedState({
      statePath: bubble.paths.statePath,
      mutate: (loaded) => ({
        ...loaded,
        state: {
          ...loaded.state,
          execution_context: {
            handoff_id: loaded.state.execution_context?.handoff_id,
            active_role: loaded.state.execution_context?.active_role,
            awaited_output_type:
              loaded.state.execution_context?.awaited_output_type,
            round: loaded.state.execution_context?.round,
            started_at: loaded.state.execution_context?.started_at,
            deadline_at: loaded.state.execution_context?.deadline_at,
            attempt: loaded.state.execution_context?.attempt
          } as never
        }
      }),
      run: (dependencies) => emitAskHumanFromWorkspace(
        {
          question: "Should we keep backwards compatibility?",
          cwd: bubble.paths.worktreePath,
          now: new Date("2026-02-21T12:10:00.000Z")
        },
        dependencies
      )
    });

    expect(result.envelope.type).toBe("HUMAN_QUESTION");
    expect(result.state.state).toBe("WAITING_HUMAN");
    expect(result.activation).toBeUndefined();
  });

  it("omits activation on the public ask-human result when reviewer is the active RUNNING role", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_ask_human_reviewer_no_activation_01",
      task: "Reviewer asks human without implementer activation provenance"
    });

    const result = await withPatchedAskHumanWorkspaceLoadedState({
      statePath: bubble.paths.statePath,
      mutate: (loaded) => ({
        ...loaded,
        state: buildBubbleStateSnapshotVariant({
          ...loaded.state,
          active_agent: bubble.config.agents.reviewer,
          active_role: "reviewer",
          execution_context: {
            ...loaded.state.execution_context,
            active_role: "reviewer",
            handoff_id:
              "reviewer:b_ask_human_reviewer_no_activation_01:round:1:attempt:1"
          } as never
        })
      }),
      run: (dependencies) => emitAskHumanFromWorkspace(
        {
          question: "Should reviewer escalate to human?",
          cwd: bubble.paths.worktreePath,
          now: new Date("2026-02-21T12:10:00.000Z")
        },
        dependencies
      )
    }) as { envelope: { type: string }; state: { state: string }; activation: unknown };

    expect(result.envelope.type).toBe("HUMAN_QUESTION");
    expect(result.state.state).toBe("WAITING_HUMAN");
    expect(result.activation).toBeUndefined();
  });

  it("omits activation on the public ask-human result when the live role and execution context role disagree", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_ask_human_role_mismatch_01",
      task: "Need clarification with role mismatch fallback"
    });

    const result = await withPatchedAskHumanWorkspaceLoadedState({
      statePath: bubble.paths.statePath,
      mutate: (loaded) => ({
        ...loaded,
        state: buildBubbleStateSnapshotVariant({
          ...loaded.state,
          active_agent: bubble.config.agents.implementer,
          active_role: "implementer",
          execution_context: {
            ...loaded.state.execution_context,
            active_role: "reviewer"
          } as never
        })
      }),
      run: (dependencies) => emitAskHumanFromWorkspace(
        {
          question: "Should we trust mismatched role provenance?",
          cwd: bubble.paths.worktreePath,
          now: new Date("2026-02-21T12:10:00.000Z")
        },
        dependencies
      )
    }) as { envelope: { type: string }; state: { state: string }; activation: unknown };

    expect(result.envelope.type).toBe("HUMAN_QUESTION");
    expect(result.state.state).toBe("WAITING_HUMAN");
    expect(result.activation).toBeUndefined();
  });

  it("emits absolute transcript fallback messageRef for HUMAN_QUESTION delivery", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_ask_human_03",
      task: "Need delivery fallback ref"
    });

    const deliveryRefs: string[] = [];
    const result = await emitAskHumanFromWorkspace(
      {
        question: "Need operator input",
        cwd: bubble.paths.worktreePath,
        now: new Date("2026-02-21T12:11:00.000Z")
      },
      {
        emitDeliveryNotificationAck: (input) => {
          if (input.messageRef === undefined) {
            throw new Error("Expected messageRef for HUMAN_QUESTION delivery.");
          }
          deliveryRefs.push(input.messageRef);
          return Promise.resolve({
            status: "accepted",
            message: "ok"
          });
        },
        emitBubbleNotification: () =>
          Promise.resolve({
            kind: "waiting-human",
            attempted: false,
            status: "rejected",
            soundPath: null,
            reason: "disabled"
          })
      }
    );

    expect(deliveryRefs).toEqual([
      `${bubble.paths.transcriptPath}#${result.envelope.id}`
    ]);
    expect(deliveryRefs[0]?.startsWith("transcript.ndjson#")).toBe(false);
  });

  it("rejects when bubble is not RUNNING", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_ask_human_02",
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
      emitAskHumanFromWorkspace({
        question: "Need human input",
        cwd: bubble.paths.worktreePath
      })
    ).rejects.toBeInstanceOf(AskHumanCommandError);
  });
});

describe("asAskHumanCommandError", () => {
  it("rethrows AskHumanCommandError instances as-is", () => {
    const original = new AskHumanCommandError("already normalized");
    expect(() => asAskHumanCommandError(original)).toThrow(original);
  });

  it("maps WorkspaceResolutionError to AskHumanCommandError", () => {
    expect(() =>
      asAskHumanCommandError(
        new WorkspaceResolutionError("workspace lookup failed")
      )
    ).toThrowError(AskHumanCommandError);
  });

  it("maps generic Error to AskHumanCommandError", () => {
    expect(() => asAskHumanCommandError(new Error("unexpected"))).toThrowError(
      AskHumanCommandError
    );
  });

  it("rethrows non-Error values unchanged", () => {
    expect(() => asAskHumanCommandError("raw-error")).toThrow("raw-error");
  });
});
