import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/core/gates/docContractGates.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as Record<string, unknown>),
    writeDocContractGateArtifact: vi.fn(async () => {
      throw new Error("simulated doc gate artifact write failure");
    })
  };
});

import { createBubble } from "../../../src/core/bubble/createBubble.js";
import * as docContractGates from "../../../src/core/gates/docContractGates.js";
import { readTranscriptEnvelopes } from "../../../src/core/protocol/transcriptStore.js";
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

    const result = await createBubble({
      id: "b_create_doc_gate_fail_open_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "document",
      task: "Document-only task: create bubble despite advisory gate artifact write failure",
      cwd: repoPath
    });

    expect(result.state.state).toBe("CREATED");
    const transcript = await readTranscriptEnvelopes(result.paths.transcriptPath);
    expect(transcript).toHaveLength(1);
    expect(transcript[0]?.type).toBe("TASK");

    const mockedWrite = vi.mocked(docContractGates.writeDocContractGateArtifact);
    expect(mockedWrite).toHaveBeenCalledTimes(1);

    const gateArtifactPath = docContractGates.resolveDocContractGateArtifactPath(
      result.paths.artifactsDir
    );
    await expect(stat(gateArtifactPath)).rejects.toMatchObject({
      code: "ENOENT"
    });

    const taskArtifact = await readFile(result.paths.taskArtifactPath, "utf8");
    expect(taskArtifact).toContain("Document-only task: create bubble despite advisory gate artifact write failure");
  });
});
