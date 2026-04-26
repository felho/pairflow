import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { parseBubbleConfigToml } from "../../../../src/config/bubbleConfig.js";
import { createBubble } from "../../../../src/v11/application/create/createCommandApi.js";
import { prepareKickoffPersistence } from "../../../../src/v11/shared/kickoff/kickoffPersistencePreparation.js";
import { initGitRepository } from "../../../helpers/git.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-kickoff-persistence-v11-"));
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

describe("prepareKickoffPersistence", () => {
  it("reads previous artifacts and renders updated ideation bubble.toml", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_kickoff_persistence_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      ideation: true,
      cwd: repoPath
    });

    const prepared = await prepareKickoffPersistence({
      taskArtifactPath: created.paths.taskArtifactPath,
      bubbleTomlPath: created.paths.bubbleTomlPath,
      nowIso: "2026-03-19T22:30:00.000Z",
      readFile
    });

    expect(prepared.previousTaskArtifact).toContain("metadata_source: ideation_placeholder");
    expect(prepared.previousBubbleToml).toContain("task_pending = true");

    const updatedConfig = parseBubbleConfigToml(prepared.nextBubbleToml);
    expect(updatedConfig.ideation?.mode).toBe(true);
    expect(updatedConfig.ideation?.task_pending).toBe(false);
    expect(updatedConfig.ideation?.kicked_off_at).toBe("2026-03-19T22:30:00.000Z");
  });

  it("does not materialize review_policy during unrelated kickoff persistence rewrites", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_kickoff_persistence_02",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      ideation: true,
      cwd: repoPath
    });

    const withoutReviewPolicy = (
      await readFile(created.paths.bubbleTomlPath, "utf8")
    ).replace(
      /\n\[review_policy\]\nreview_loop_mode = ".*?"\nreviewer_blocking_min_severity = ".*?"\nmeta_review_auto_rework_min_severity = ".*?"\n/u,
      "\n"
    );
    await writeFile(created.paths.bubbleTomlPath, withoutReviewPolicy, "utf8");

    const prepared = await prepareKickoffPersistence({
      taskArtifactPath: created.paths.taskArtifactPath,
      bubbleTomlPath: created.paths.bubbleTomlPath,
      nowIso: "2026-03-19T22:35:00.000Z",
      readFile
    });

    expect(prepared.previousBubbleToml).not.toContain("[review_policy]");
    expect(prepared.nextBubbleToml).not.toContain("[review_policy]");
    const updatedConfig = parseBubbleConfigToml(prepared.nextBubbleToml);
    expect(updatedConfig.review_policy).toBeUndefined();
    expect(updatedConfig.ideation?.task_pending).toBe(false);
    expect(updatedConfig.ideation?.kicked_off_at).toBe("2026-03-19T22:35:00.000Z");
  });
});
