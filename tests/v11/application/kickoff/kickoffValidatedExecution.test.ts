import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createBubble } from "../../../../src/core/bubble/createBubble.js";
import { IDEATION_KICKOFF_STATE_CONFLICT } from "../../../../src/core/bubble/ideation.js";
import { renderBubbleConfigToml } from "../../../../src/config/bubbleConfig.js";
import type { BubbleStateSnapshot } from "../../../../src/types/bubble.js";
import type { ResolvedKickoffDependencies } from "../../../../src/v11/shared/kickoff/kickoffDependencyResolution.js";
import type { KickoffPreparedValidation } from "../../../../src/v11/shared/kickoff/kickoffValidationPreparation.js";
import { executeKickoffValidatedFlow } from "../../../../src/v11/shared/kickoff/kickoffValidatedExecution.js";
import { initGitRepository } from "../../../helpers/git.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-kickoff-exec-v11-"));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
}

function createRunningState(base: BubbleStateSnapshot): BubbleStateSnapshot {
  return {
    ...base,
    state: "RUNNING",
    round: 0,
    active_agent: "claude",
    active_role: "reviewer"
  };
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("executeKickoffValidatedFlow", () => {
  it("returns kickoff conflict result when state fingerprint changed before write", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_kickoff_exec_conflict_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      ideation: true,
      cwd: repoPath
    });
    const currentState = createRunningState(created.state);
    const readState = vi.fn(async () => ({
      state: currentState,
      fingerprint: "latest-fingerprint"
    }));
    const writeState = vi.fn(async () => ({
      state: currentState,
      fingerprint: "written-fingerprint"
    }));

    const dependencies = {
      resolveBubble: vi.fn(async () => ({})),
      readState,
      writeState,
      readFileFn: vi.fn(async (...args: unknown[]) => {
        void args;
        return renderBubbleConfigToml(created.config);
      }),
      writeFileFn: vi.fn(async () => undefined),
      appendEnvelope: vi.fn(async () => ({}))
    } as unknown as ResolvedKickoffDependencies;

    const validation = {
      kind: "prepared",
      resolved: {
        bubbleId: created.bubbleId,
        bubbleConfig: created.config,
        bubblePaths: created.paths,
        repoPath
      },
      loadedState: {
        state: currentState,
        fingerprint: "stale-fingerprint"
      },
      state: currentState,
      markersBefore: {
        ideation_mode: true,
        ideation_task_pending: true
      },
      task: {
        content: "Kickoff execution conflict task",
        source: "inline"
      }
    } as KickoffPreparedValidation;

    const result = await executeKickoffValidatedFlow({
      validation,
      now: new Date("2026-03-19T23:20:00.000Z"),
      nowIso: "2026-03-19T23:20:00.000Z"
    }, dependencies);

    expect(result).toMatchObject({
      ok: false,
      reason_code: IDEATION_KICKOFF_STATE_CONFLICT,
      state_changed: false
    });
    expect(writeState).not.toHaveBeenCalled();
  });
});
