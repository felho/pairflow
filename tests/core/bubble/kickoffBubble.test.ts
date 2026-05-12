import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { parseBubbleConfigToml, renderBubbleConfigToml } from "../../../src/config/bubbleConfig.js";
import { createBubble } from "../../../src/v11/defaults/create/createBubbleApi.js";
import { kickoffBubble } from "../../../src/v11/application/kickoff/kickoffBubble.js";
import { buildRunningExecutionContext } from "../../../src/v11/domain/state/execution/executionContext.js";
import {
  IDEATION_ALREADY_ACTIVE,
  IDEATION_KICKOFF_NOT_ALLOWED,
  IDEATION_KICKOFF_NOT_ELIGIBLE,
  IDEATION_KICKOFF_PERSISTENCE_FAILED,
  IDEATION_KICKOFF_REQUIRES_RUNNING,
  IDEATION_KICKOFF_TASK_INVALID,
  IDEATION_KICKOFF_STATE_CONFLICT
} from "../../../src/v11/shared/ideation/ideationReasonCodes.js";
import { readTranscriptEnvelopes } from "../../../src/v11/infrastructure/artifact/transcript/transcriptStore.js";
import {
  readStateSnapshot,
  StateStoreConflictError,
  writeStateSnapshot as rawWriteStateSnapshot
} from "../../../src/v11/infrastructure/state/stateStore.js";
import { initGitRepository } from "../../helpers/git.js";
import { asTemporaryVariantStateFixture } from "../../helpers/temporaryVariantStateFixture.js";

// Step 4b-γ/4 transitional: 4b-γ/5 cleanup target.
const writeStateSnapshot = (
  statePath: Parameters<typeof rawWriteStateSnapshot>[0],
  state: unknown,
  options?: Parameters<typeof rawWriteStateSnapshot>[2]
): ReturnType<typeof rawWriteStateSnapshot> => rawWriteStateSnapshot(statePath, asTemporaryVariantStateFixture(state), options);

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-kickoff-"));
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

async function setIdeationRunningRoundZero(statePath: string): Promise<void> {
  const loaded = await readStateSnapshot(statePath);
  await writeStateSnapshot(
    statePath,
    {
      ...loaded.state,
      state: "RUNNING",
      round: 0,
      execution_context: null,
      active_agent: "codex",
      active_role: "implementer",
      active_since: "2026-03-15T12:00:00.000Z",
      last_command_at: "2026-03-15T12:00:00.000Z",
      round_role_history: []
    },
    {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "CREATED"
    }
  );
}

describe("kickoffBubble", () => {
  it("activates ideation bubble and appends first TASK envelope", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_kickoff_core_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      ideation: true,
      cwd: repoPath
    });
    await setIdeationRunningRoundZero(created.paths.statePath);

    const result = await kickoffBubble({
      bubbleId: created.bubbleId,
      repoPath,
      task: "Implement activation flow",
      cwd: repoPath,
      now: new Date("2026-03-15T12:05:00.000Z")
    });

    expect(result.ok).toBe(true);
    expect(result.reason_code).toBeNull();
    expect(result.protocol.task_envelope_appended).toBe(true);
    expect(result.markers_before).toEqual({
      ideation_mode: true,
      ideation_task_pending: true
    });
    expect(result.markers_after).toEqual({
      ideation_mode: true,
      ideation_task_pending: false
    });
    expect(result.state_after?.round).toBe(1);
    expect(result.state_after?.round_role_history.some((entry) => entry.round === 1)).toBe(
      true
    );

    const transcript = await readTranscriptEnvelopes(created.paths.transcriptPath);
    expect(transcript).toHaveLength(1);
    expect(transcript[0]?.type).toBe("TASK");
    expect(transcript[0]?.payload.summary).toBe("Implement activation flow");

    const taskArtifact = await readFile(created.paths.taskArtifactPath, "utf8");
    expect(taskArtifact).toContain("Source: inline text");
    expect(taskArtifact).toContain("Implement activation flow");

    const bubbleConfig = parseBubbleConfigToml(
      await readFile(created.paths.bubbleTomlPath, "utf8")
    );
    expect(bubbleConfig.ideation?.mode).toBe(true);
    expect(bubbleConfig.ideation?.task_pending).toBe(false);
    expect(bubbleConfig.ideation?.kicked_off_at).toBe("2026-03-15T12:05:00.000Z");
  });

  it("rejects kickoff when task-file still contains ideation placeholder marker", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_kickoff_core_09",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      ideation: true,
      cwd: repoPath
    });
    await setIdeationRunningRoundZero(created.paths.statePath);

    const transcriptBefore = await readTranscriptEnvelopes(created.paths.transcriptPath);
    const result = await kickoffBubble({
      bubbleId: created.bubbleId,
      repoPath,
      taskFile: created.paths.taskArtifactPath,
      cwd: repoPath
    });

    expect(result.ok).toBe(false);
    expect(result.reason_code).toBe(IDEATION_KICKOFF_TASK_INVALID);
    expect(result.state_changed).toBe(false);
    expect(result.protocol.task_envelope_appended).toBe(false);
    expect(result.markers_before).toEqual({
      ideation_mode: true,
      ideation_task_pending: true
    });

    const stateAfter = await readStateSnapshot(created.paths.statePath);
    expect(stateAfter.state.round).toBe(0);
    expect(stateAfter.state.active_role).toBe("implementer");

    const bubbleConfig = parseBubbleConfigToml(
      await readFile(created.paths.bubbleTomlPath, "utf8")
    );
    expect(bubbleConfig.ideation?.task_pending).toBe(true);
    expect(bubbleConfig.ideation?.kicked_off_at).toBeUndefined();

    const transcriptAfter = await readTranscriptEnvelopes(created.paths.transcriptPath);
    expect(transcriptAfter).toEqual(transcriptBefore);
  });

  it("rejects kickoff for non-ideation bubbles", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_kickoff_core_02",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Legacy task",
      cwd: repoPath
    });

    const transcriptBefore = await readTranscriptEnvelopes(created.paths.transcriptPath);
    const result = await kickoffBubble({
      bubbleId: created.bubbleId,
      repoPath,
      task: "Should reject",
      cwd: repoPath
    });

    expect(result.ok).toBe(false);
    expect(result.reason_code).toBe(IDEATION_KICKOFF_NOT_ALLOWED);
    const transcriptAfter = await readTranscriptEnvelopes(created.paths.transcriptPath);
    expect(transcriptAfter).toEqual(transcriptBefore);
  });

  it("rejects kickoff when ideation bubble is not running", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_kickoff_core_06",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      ideation: true,
      cwd: repoPath
    });

    const transcriptBefore = await readTranscriptEnvelopes(created.paths.transcriptPath);
    const result = await kickoffBubble({
      bubbleId: created.bubbleId,
      repoPath,
      task: "Should require running state",
      cwd: repoPath
    });

    expect(result.ok).toBe(false);
    expect(result.reason_code).toBe(IDEATION_KICKOFF_REQUIRES_RUNNING);
    const transcriptAfter = await readTranscriptEnvelopes(created.paths.transcriptPath);
    expect(transcriptAfter).toEqual(transcriptBefore);
  });

  it("enforces kickoff precedence and eligibility guards", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_kickoff_core_03",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      ideation: true,
      cwd: repoPath
    });

    await setIdeationRunningRoundZero(created.paths.statePath);
    const loaded = await readStateSnapshot(created.paths.statePath);
    await writeStateSnapshot(
      created.paths.statePath,
      {
        ...loaded.state,
        execution_context: buildRunningExecutionContext({
          bubbleId: created.bubbleId,
          round: 1,
          activeRole: loaded.state.active_role ?? "implementer",
          startedAt: loaded.state.active_since ?? "2026-03-15T12:00:00.000Z",
          watchdogTimeoutMinutes: 60,
          attempt: 1
        }),
        round: 1
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );
    const activeRoundResult = await kickoffBubble({
      bubbleId: created.bubbleId,
      repoPath,
      task: "Should hit active precedence",
      cwd: repoPath
    });
    expect(activeRoundResult.ok).toBe(false);
    expect(activeRoundResult.reason_code).toBe(IDEATION_ALREADY_ACTIVE);

    const bubbleConfig = parseBubbleConfigToml(
      await readFile(created.paths.bubbleTomlPath, "utf8")
    );
    const normalizedConfig = {
      ...bubbleConfig,
      ideation: {
        mode: true,
        task_pending: false
      }
    };
    await writeFile(
      created.paths.bubbleTomlPath,
      renderBubbleConfigToml(normalizedConfig),
      "utf8"
    );
    const resetLoaded = await readStateSnapshot(created.paths.statePath);
    await writeStateSnapshot(
      created.paths.statePath,
      {
        ...resetLoaded.state,
        execution_context: null,
        round: 0
      },
      {
        expectedFingerprint: resetLoaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const nonEligibleResult = await kickoffBubble({
      bubbleId: created.bubbleId,
      repoPath,
      task: "Should fail eligibility",
      cwd: repoPath
    });
    expect(nonEligibleResult.ok).toBe(false);
    expect(nonEligibleResult.reason_code).toBe(IDEATION_KICKOFF_NOT_ELIGIBLE);
  });

  it("keeps artifact/transcript/state unchanged on CAS state conflict", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_kickoff_core_07",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      ideation: true,
      cwd: repoPath
    });
    await setIdeationRunningRoundZero(created.paths.statePath);
    const stateBefore = await readStateSnapshot(created.paths.statePath);
    const taskBefore = await readFile(created.paths.taskArtifactPath, "utf8");
    const transcriptBefore = await readTranscriptEnvelopes(created.paths.transcriptPath);

    const result = await kickoffBubble(
      {
        bubbleId: created.bubbleId,
        repoPath,
        task: "Should hit synthetic state conflict",
        cwd: repoPath
      },
      {
        writeStateSnapshot: async () => {
          throw new StateStoreConflictError("synthetic conflict");
        }
      }
    );

    expect(result.ok).toBe(false);
    expect(result.reason_code).toBe(IDEATION_KICKOFF_STATE_CONFLICT);
    const stateAfter = await readStateSnapshot(created.paths.statePath);
    const taskAfter = await readFile(created.paths.taskArtifactPath, "utf8");
    const transcriptAfter = await readTranscriptEnvelopes(created.paths.transcriptPath);
    expect(stateAfter.state).toEqual(stateBefore.state);
    expect(taskAfter).toBe(taskBefore);
    expect(transcriptAfter).toEqual(transcriptBefore);
  });

  it("preserves infrastructure errors when task-file cannot be read", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_kickoff_core_04",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      ideation: true,
      cwd: repoPath
    });
    await setIdeationRunningRoundZero(created.paths.statePath);

    const unreadableTaskFile = join(repoPath, "unreadable-task.md");
    await writeFile(unreadableTaskFile, "Task from file\n", "utf8");
    await chmod(unreadableTaskFile, 0o000);

    await expect(
      kickoffBubble({
        bubbleId: created.bubbleId,
        repoPath,
        taskFile: unreadableTaskFile,
        cwd: repoPath
      })
    ).rejects.toThrow(/(EACCES|EPERM|permission denied|operation not permitted)/iu);

    await chmod(unreadableTaskFile, 0o644);
  });

  it("rolls back state/artifact/transcript on metadata persistence failure", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_kickoff_core_05",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      ideation: true,
      cwd: repoPath
    });
    await setIdeationRunningRoundZero(created.paths.statePath);
    const taskBefore = await readFile(created.paths.taskArtifactPath, "utf8");
    const stateBefore = await readStateSnapshot(created.paths.statePath);
    const transcriptBefore = await readTranscriptEnvelopes(created.paths.transcriptPath);
    const configBefore = await readFile(created.paths.bubbleTomlPath, "utf8");
    let hasFailedConfigWrite = false;

    const result = await kickoffBubble(
      {
        bubbleId: created.bubbleId,
        repoPath,
        task: "Config write should fail",
        cwd: repoPath
      },
      {
        writeFile: async (path, data, options) => {
          if (path === created.paths.bubbleTomlPath && !hasFailedConfigWrite) {
            hasFailedConfigWrite = true;
            throw new Error("synthetic config write failure");
          }
          return writeFile(path, data, options);
        }
      }
    );

    expect(result.ok).toBe(false);
    expect(result.reason_code).toBe(IDEATION_KICKOFF_PERSISTENCE_FAILED);

    const taskAfter = await readFile(created.paths.taskArtifactPath, "utf8");
    const stateAfter = await readStateSnapshot(created.paths.statePath);
    const transcriptAfter = await readTranscriptEnvelopes(created.paths.transcriptPath);
    const configAfter = await readFile(created.paths.bubbleTomlPath, "utf8");
    expect(taskAfter).toBe(taskBefore);
    expect(stateAfter.state).toEqual(stateBefore.state);
    expect(transcriptAfter).toEqual(transcriptBefore);
    expect(configAfter).toBe(configBefore);
  });

  it("rejects kickoff when parse_warning exists with or without token", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_kickoff_core_08",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      ideation: true,
      cwd: repoPath
    });
    await setIdeationRunningRoundZero(created.paths.statePath);

    const baseConfig = parseBubbleConfigToml(
      await readFile(created.paths.bubbleTomlPath, "utf8")
    );

    for (const parseWarning of [
      "IDEATION_METADATA_PARSE_WARNING: tokened warning",
      "synthetic non-token warning"
    ]) {
      await writeFile(
        created.paths.bubbleTomlPath,
        renderBubbleConfigToml({
          ...baseConfig,
          ideation: {
            mode: true,
            task_pending: true,
            parse_warning: parseWarning
          }
        }),
        "utf8"
      );
      const result = await kickoffBubble({
        bubbleId: created.bubbleId,
        repoPath,
        task: "Should reject on parse warning",
        cwd: repoPath
      });
      expect(result.ok).toBe(false);
      expect(result.reason_code).toBe(IDEATION_KICKOFF_NOT_ALLOWED);
    }
  });
});
