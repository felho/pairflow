import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createBubble } from "../../../../src/core/bubble/createBubble.js";
import { IDEATION_KICKOFF_NOT_ALLOWED } from "../../../../src/v11/shared/ideation/ideationReasonCodes.js";
import { readStateSnapshot } from "../../../../src/v11/infrastructure/state/stateStore.js";
import { prepareKickoffEligibility } from "../../../../src/v11/shared/kickoff/kickoffEligibilityPreparation.js";
import { initGitRepository } from "../../../helpers/git.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-kickoff-elig-prep-v11-"));
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

describe("prepareKickoffEligibility", () => {
  it("resolves markers and null failure reason for eligible kickoff", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_kickoff_eligibility_prep_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      ideation: true,
      cwd: repoPath
    });
    const loaded = await readStateSnapshot(created.paths.statePath);

    const prepared = prepareKickoffEligibility({
      bubbleConfig: created.config,
      state: {
        ...loaded.state,
        state: "RUNNING"
      }
    });

    expect(prepared).toEqual({
      markersBefore: {
        ideation_mode: true,
        ideation_task_pending: true
      },
      eligibilityFailureReason: null
    });
  });

  it("returns parse-warning guard reason when ideation parse warning exists", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_kickoff_eligibility_prep_02",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      ideation: true,
      cwd: repoPath
    });
    const loaded = await readStateSnapshot(created.paths.statePath);

    const prepared = prepareKickoffEligibility({
      bubbleConfig: {
        ...created.config,
        ideation: {
          ...created.config.ideation!,
          parse_warning: "invalid ideation config"
        }
      },
      state: loaded.state
    });

    expect(prepared.eligibilityFailureReason).toBe(IDEATION_KICKOFF_NOT_ALLOWED);
  });
});
