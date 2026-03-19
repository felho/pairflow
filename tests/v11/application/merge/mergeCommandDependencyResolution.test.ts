import { describe, expect, it } from "vitest";

import { resolveMergeCommandDependencies } from "../../../../src/v11/shared/merge/mergeCommandDependencyResolution.js";

describe("mergeCommandDependencyResolution", () => {
  it("preserves explicit dependency overrides", () => {
    const customRunGit = (async () =>
      ({
        exitCode: 0,
        stdout: "",
        stderr: ""
      })) as never;

    const resolved = resolveMergeCommandDependencies({
      runGit: customRunGit
    });

    expect(resolved.runGit).toBe(customRunGit);
  });
});
