import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { emitConvergedFromWorkspace } from "../../../../src/core/agent/converged.js";
import { emitPassFromWorkspace } from "../../../../src/core/agent/pass.js";
import { submitMetaReviewResult } from "../../../../src/core/bubble/metaReview.js";
import { emitApprove } from "../../../../src/core/human/approval.js";
import { commitBubbleV11 } from "../../../../src/v11/application/commit/emitCommitV11.js";
import { readStateSnapshot } from "../../../../src/v11/infrastructure/state/stateStore.js";
import { readTranscriptEnvelopes } from "../../../../src/v11/infrastructure/artifact/transcript/transcriptStore.js";
import { initGitRepository, runGit } from "../../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../../helpers/bubble.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-commit-v11-"));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
}

function buildActiveMetaReviewerSession(input: {
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
}) {
  return {
    [input.bubbleId]: {
      bubbleId: input.bubbleId,
      repoPath: input.repoPath,
      worktreePath: input.worktreePath,
      tmuxSessionName: "pf_commit_v11_fixture",
      updatedAt: "2026-02-22T15:03:00.000Z",
      metaReviewerPane: {
        role: "meta-reviewer" as const,
        paneIndex: 3,
        active: true,
        updatedAt: "2026-02-22T15:03:00.000Z"
      }
    }
  };
}

async function setupApprovedBubble(repoPath: string, bubbleId: string) {
  const bubble = await setupRunningBubbleFixture({
    repoPath,
    bubbleId,
    task: "Finalize task"
  });

  await emitPassFromWorkspace({
    summary: "Implementation pass 1",
    cwd: bubble.paths.worktreePath,
    now: new Date("2026-02-22T15:00:00.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Review pass 1 clean",
    noFindings: true,
    cwd: bubble.paths.worktreePath,
    now: new Date("2026-02-22T15:01:00.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Implementation pass 2",
    cwd: bubble.paths.worktreePath,
    now: new Date("2026-02-22T15:02:00.000Z")
  });
  const converged = await emitConvergedFromWorkspace({
    summary: "Ready for approval",
    cwd: bubble.paths.worktreePath,
    now: new Date("2026-02-22T15:03:00.000Z")
  });
  await submitMetaReviewResult(
    {
      bubbleId: bubble.bubbleId,
      repoPath,
      round: converged.state.round,
      recommendation: "approve",
      summary: "No findings remain after this review.",
      report_json: {
        findings_claim_state: "clean",
        findings_claim_source: "meta_review_artifact",
        findings_count: 0
      }
    },
    {
      now: new Date("2026-02-22T15:03:30.000Z"),
      readRuntimeSessionsRegistry: async () => {
        await Promise.resolve();
        return buildActiveMetaReviewerSession({
          bubbleId: bubble.bubbleId,
          repoPath,
          worktreePath: bubble.paths.worktreePath
        });
      }
    }
  );
  await emitApprove({
    bubbleId: bubble.bubbleId,
    cwd: repoPath,
    now: new Date("2026-02-22T15:04:00.000Z")
  });

  return bubble;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("commitCommandApi", () => {
  it("commits staged files and transitions bubble to DONE", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupApprovedBubble(repoPath, "b_commit_v11_01");

    await writeFile(
      join(bubble.paths.worktreePath, "feature.txt"),
      "new behavior\n",
      "utf8"
    );
    await runGit(bubble.paths.worktreePath, ["add", "feature.txt"]);
    await writeFile(
      join(bubble.paths.artifactsDir, "done-package.md"),
      "# Done Package\n\nImplemented feature X with tests.\n",
      "utf8"
    );

    const result = await commitBubbleV11({
      bubbleId: bubble.bubbleId,
      cwd: repoPath,
      now: new Date("2026-02-22T15:10:00.000Z")
    });

    expect(result.state.state).toBe("DONE");
    expect(result.commitSha.length).toBeGreaterThan(6);
    expect(result.stagedFiles).toEqual(["feature.txt"]);
    expect(result.envelope.type).toBe("DONE_PACKAGE");

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    expect(loaded.state.state).toBe("DONE");

    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    expect(transcript.at(-1)?.type).toBe("DONE_PACKAGE");
  });
});
