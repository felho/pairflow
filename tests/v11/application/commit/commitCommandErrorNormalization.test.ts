import { describe, expect, it } from "vitest";

import { BubbleLookupError } from "../../../../src/core/bubble/bubbleLookup.js";
import { GitCommandError } from "../../../../src/core/workspace/git.js";
import {
  BubbleCommitError,
  createBubbleCommitError,
  isBubbleCommitError
} from "../../../../src/v11/shared/commit/commitCommandError.js";
import { normalizeBubbleCommitError } from "../../../../src/v11/shared/commit/commitCommandErrorNormalization.js";

describe("commitCommandErrorNormalization", () => {
  it("preserves BubbleCommitError instances", () => {
    const original = new BubbleCommitError("already-normalized");
    const normalized = normalizeBubbleCommitError({
      error: original,
      isBubbleCommitError,
      createBubbleCommitError
    });

    expect(normalized).toBe(original);
    expect(original.context).toEqual({
      command_name: "commit"
    });
  });

  it("maps bubble lookup and git command errors to BubbleCommitError", () => {
    const fromLookup = normalizeBubbleCommitError({
      error: new BubbleLookupError("bubble not found"),
      isBubbleCommitError,
      createBubbleCommitError,
      isBubbleLookupError: (candidate) => candidate instanceof BubbleLookupError
    });
    expect(fromLookup).toBeInstanceOf(BubbleCommitError);
    expect((fromLookup as Error).message).toBe("bubble not found");

    const fromGit = normalizeBubbleCommitError({
      error: new GitCommandError(["commit", "-m", "x"], 1, "git commit failed"),
      isBubbleCommitError,
      createBubbleCommitError,
      isGitCommandError: (candidate) => candidate instanceof GitCommandError
    });
    expect(fromGit).toBeInstanceOf(BubbleCommitError);
    expect((fromGit as Error).message).toContain("git commit failed");
    expect((fromGit as BubbleCommitError).context).toEqual({
      command_name: "commit"
    });
  });
});
