import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { emitConvergedFromWorkspace } from "../../../src/core/agent/converged.js";
import { emitPassFromWorkspace } from "../../../src/core/agent/pass.js";
import { commitBubble } from "../../../src/core/bubble/commitBubble.js";
import { emitApprove } from "../../../src/core/human/approval.js";
import { commitBubbleV11 } from "../../../src/v11/application/commit/emitCommitV11.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { initGitRepository } from "../../helpers/git.js";

async function withTempRepo<T>(run: (repoPath: string) => Promise<T>): Promise<T> {
  const repoPath = await mkdtemp(join(tmpdir(), "pairflow-commit-contract-"));
  try {
    await initGitRepository(repoPath);
    return await run(repoPath);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
}

async function setupApprovedBubble(repoPath: string, bubbleId: string) {
  const bubble = await setupRunningBubbleFixture({
    repoPath,
    bubbleId,
    task: "Commit contract parity fixture"
  });

  await emitPassFromWorkspace({
    summary: "Implementation pass 1",
    cwd: bubble.paths.worktreePath,
    now: new Date("2026-03-20T10:30:00.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Review pass 1 clean",
    noFindings: true,
    cwd: bubble.paths.worktreePath,
    now: new Date("2026-03-20T10:31:00.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Implementation pass 2",
    cwd: bubble.paths.worktreePath,
    now: new Date("2026-03-20T10:32:00.000Z")
  });
  await emitConvergedFromWorkspace({
    summary: "Ready for approval",
    cwd: bubble.paths.worktreePath,
    now: new Date("2026-03-20T10:33:00.000Z")
  });
  await emitApprove({
    bubbleId: bubble.bubbleId,
    overrideNonApprove: true,
    overrideReason: "Human override for commit contract fixture setup.",
    cwd: repoPath,
    now: new Date("2026-03-20T10:34:00.000Z")
  });

  return bubble;
}

describe("v11 commit contract parity", () => {
  it("keeps core facade and v11 commit output parity on APPROVED_FOR_COMMIT bubble", async () => {
    const legacy = await withTempRepo(async (repoPath) => {
      const bubble = await setupApprovedBubble(repoPath, "b_commit_contract_legacy");
      await writeFile(
        join(bubble.paths.worktreePath, "feature-auto.txt"),
        "legacy\n",
        "utf8"
      );
      return commitBubble({
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        auto: true,
        now: new Date("2026-03-20T10:40:00.000Z")
      });
    });

    const v11 = await withTempRepo(async (repoPath) => {
      const bubble = await setupApprovedBubble(repoPath, "b_commit_contract_v11");
      await writeFile(
        join(bubble.paths.worktreePath, "feature-auto.txt"),
        "v11\n",
        "utf8"
      );
      return commitBubbleV11({
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        auto: true,
        now: new Date("2026-03-20T10:40:00.000Z")
      });
    });

    const normalize = (result: Awaited<typeof legacy>) => ({
      state: result.state.state,
      envelopeType: result.envelope.type,
      stagedFiles: [...result.stagedFiles].sort(),
      hasCommitSha: result.commitSha.length > 6,
      donePackageSuffix: result.donePackagePath.endsWith("/artifacts/done-package.md")
    });

    expect(normalize(legacy)).toEqual(normalize(v11));
    expect(normalize(legacy)).toMatchObject({
      state: "DONE",
      envelopeType: "DONE_PACKAGE",
      stagedFiles: ["feature-auto.txt"],
      hasCommitSha: true,
      donePackageSuffix: true
    });
  });
});
