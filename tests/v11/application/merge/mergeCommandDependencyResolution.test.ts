import { describe, expect, it } from "vitest";

import { resolveMergeCommandDependencies } from "../../../../src/v11/application/merge/mergeCommandDependencyResolution.js";

describe("mergeCommandDependencyResolution", () => {
  it("preserves explicit dependency overrides", async () => {
    const customRunGit = (async () =>
      ({
        exitCode: 0,
        stdout: "",
        stderr: ""
      })) as never;

    const resolved = await resolveMergeCommandDependencies({
      runGit: customRunGit
    });

    expect(resolved.runGit).toBe(customRunGit);
  });
});
