import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  REVIEW_POLICY_STATE_CONFLICT,
  updateBubbleReviewPolicyForUi
} from "../../../src/v11/defaults/ui/updateBubbleReviewPolicyForUi.js";
import { applyStateTransition } from "../../../src/v11/domain/state/machine.js";
import { withFileLock } from "../../../src/v11/infrastructure/foundation/fs/fileLock.js";
import { readStateSnapshot } from "../../../src/v11/infrastructure/state/stateStore.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { initGitRepository } from "../../helpers/git.js";

const tempDirs: string[] = [];

async function createTempRepo(prefix = "pairflow-update-review-policy-ui-"): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("updateBubbleReviewPolicyForUi", () => {
  it("revalidates mutable lifecycle state under the shared state lock before writing bubble.toml", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      bubbleId: "b-update-policy-lock-01",
      repoPath,
      task: "Lock-aware state revalidation test."
    });
    const initialBubbleToml = await readFile(bubble.paths.bubbleTomlPath, "utf8");
    let pendingUpdate:
      | ReturnType<typeof updateBubbleReviewPolicyForUi>
      | undefined;

    await withFileLock(
      {
        lockPath: `${bubble.paths.statePath}.lock`,
        timeoutMs: 5_000
      },
      async () => {
        pendingUpdate = updateBubbleReviewPolicyForUi({
          bubbleId: bubble.bubbleId,
          repoPath,
          reviewLoopMode: "meta_only",
          expectedBubbleToml: initialBubbleToml
        });
        const loaded = await readStateSnapshot(bubble.paths.statePath);
        await writeFile(
          bubble.paths.statePath,
          `${JSON.stringify(
            applyStateTransition(loaded.state, {
              to: "CANCELLED",
              activeAgent: null,
              activeRole: null,
              activeSince: null,
              lastCommandAt: "2026-02-21T12:05:00.000Z"
            }),
            null,
            2
          )}\n`,
          "utf8"
        );
      }
    );

    if (pendingUpdate === undefined) {
      throw new Error("Expected pending review-policy update promise to be created.");
    }

    await expect(pendingUpdate).rejects.toMatchObject({
      name: "UiBubbleReviewPolicyStateConflictError",
      reasonCode: REVIEW_POLICY_STATE_CONFLICT,
      currentState: "CANCELLED"
    });
    await expect(readFile(bubble.paths.bubbleTomlPath, "utf8")).resolves.toBe(
      initialBubbleToml
    );
  });
});
