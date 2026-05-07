import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createBubble } from "../../../src/v11/defaults/create/createBubbleApi.js";
import {
  resolveDocContractGateArtifactPath
} from "../../../src/v11/defaults/gates/docContractGateArtifactDefaults.js";
import { readTranscriptEnvelopes } from "../../../src/v11/infrastructure/artifact/transcript/transcriptStore.js";
import { initGitRepository } from "../../helpers/git.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-bubble-create-fail-open-"));
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

describe("createBubble (doc gate artifact fail-open)", () => {
  it("continues bubble creation when advisory doc gate artifact write fails", async () => {
    const repoPath = await createTempRepo();
    const writeDocContractGateArtifact = vi.fn(async () => {
      throw new Error("simulated doc gate artifact write failure");
    });

    const result = await createBubble(
      {
        id: "b_create_doc_gate_fail_open_01",
        repoPath,
        baseBranch: "main",
        reviewArtifactType: "document",
        task: "Document-only task: create bubble despite advisory gate artifact write failure",
        cwd: repoPath
      },
      {
        writeDocContractGateArtifact
      }
    );

    expect(result.state.state).toBe("CREATED");
    const transcript = await readTranscriptEnvelopes(result.paths.transcriptPath);
    expect(transcript).toHaveLength(1);
    expect(transcript[0]?.type).toBe("TASK");

    expect(writeDocContractGateArtifact).toHaveBeenCalledTimes(1);

    const gateArtifactPath = resolveDocContractGateArtifactPath(
      result.paths.artifactsDir
    );
    await expect(stat(gateArtifactPath)).rejects.toMatchObject({
      code: "ENOENT"
    });

    const taskArtifact = await readFile(result.paths.taskArtifactPath, "utf8");
    expect(taskArtifact).toContain("Document-only task: create bubble despite advisory gate artifact write failure");
  });
});
