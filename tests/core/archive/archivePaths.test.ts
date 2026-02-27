import { describe, expect, it } from "vitest";

import {
  deriveArchiveRepoKey,
  resolveArchivePaths
} from "../../../src/core/archive/archivePaths.js";

describe("archivePaths", () => {
  it("derives deterministic 16-char repo keys", () => {
    const repoPath = "/tmp/pairflow/repo";
    const first = deriveArchiveRepoKey(repoPath);
    const second = deriveArchiveRepoKey(repoPath);

    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f]{16}$/u);
  });

  it("resolves archive index and bubble instance paths", async () => {
    const result = await resolveArchivePaths({
      repoPath: "/tmp/pairflow/repo",
      bubbleInstanceId: "bi_00m90jbzy0_aabbccddeeff00112233",
      archiveRootPath: "/tmp/pairflow/archive-root"
    });

    expect(result.archiveRootPath).toBe("/tmp/pairflow/archive-root");
    expect(result.archiveIndexPath).toBe("/tmp/pairflow/archive-root/index.json");
    expect(result.repoArchiveRootPath).toBe(
      `/tmp/pairflow/archive-root/${result.repoKey}`
    );
    expect(result.bubbleInstanceArchivePath).toBe(
      `/tmp/pairflow/archive-root/${result.repoKey}/bi_00m90jbzy0_aabbccddeeff00112233`
    );
  });
});
