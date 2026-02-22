import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createBubble } from "../../../src/core/bubble/createBubble.js";
import { stopBubble, StopBubbleError } from "../../../src/core/bubble/stopBubble.js";
import { readStateSnapshot } from "../../../src/core/state/stateStore.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { initGitRepository } from "../../helpers/git.js";

const tempDirs: string[] = [];

async function createTempRepo(prefix = "pairflow-stop-bubble-"): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
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

describe("stopBubble", () => {
  it("stops runtime ownership and transitions bubble to CANCELLED", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_stop_01",
      task: "Stop task"
    });

    let terminateCalled = false;
    let removeCalled = false;
    const result = await stopBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T21:00:00.000Z")
      },
      {
        terminateBubbleTmuxSession: () => {
          terminateCalled = true;
          return Promise.resolve({
            sessionName: "pf-b_stop_01",
            existed: true
          });
        },
        removeRuntimeSession: () => {
          removeCalled = true;
          return Promise.resolve(true);
        }
      }
    );

    expect(terminateCalled).toBe(true);
    expect(removeCalled).toBe(true);
    expect(result.state.state).toBe("CANCELLED");
    expect(result.state.active_agent).toBeNull();
    expect(result.state.active_role).toBeNull();
    expect(result.state.active_since).toBeNull();
    expect(result.runtimeSessionRemoved).toBe(true);
    expect(result.tmuxSessionExisted).toBe(true);

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    expect(loaded.state.state).toBe("CANCELLED");
  });

  it("rejects stop when bubble is already in final state", async () => {
    const repoPath = await createTempRepo();
    const bubble = await createBubble({
      id: "b_stop_02",
      repoPath,
      baseBranch: "main",
      task: "Task",
      cwd: repoPath
    });

    await stopBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T21:05:00.000Z")
      },
      {
        terminateBubbleTmuxSession: () =>
          Promise.resolve({
            sessionName: "pf-b_stop_02",
            existed: false
          }),
        removeRuntimeSession: () => Promise.resolve(false)
      }
    );

    await expect(
      stopBubble({
        bubbleId: bubble.bubbleId,
        cwd: repoPath
      })
    ).rejects.toBeInstanceOf(StopBubbleError);
  });
});
