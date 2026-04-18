import { describe, expect, it } from "vitest";

import { BubbleLookupError } from "../../../../src/v11/infrastructure/executor/workspace/bubbleLookup.js";
import { GitCommandError } from "../../../../src/v11/infrastructure/workspace/git.js";
import { RemoteBubbleCommitCommandError } from "../../../../src/v11/infrastructure/executor/ssh/sshBubbleCommitCommand.js";
import { RemoteBubbleStatusError } from "../../../../src/v11/infrastructure/executor/ssh/sshBubbleStatus.js";
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

  it("preserves remote status reason codes on normalized commit errors", () => {
    const normalized = normalizeBubbleCommitError({
      error: new RemoteBubbleStatusError({
        code: "REMOTE_STATUS_CONFIG_INVALID",
        message: "host mismatch"
      }),
      isBubbleCommitError,
      createBubbleCommitError,
      isRemoteBubbleStatusError: (candidate) =>
        candidate instanceof RemoteBubbleStatusError
    });

    expect(normalized).toBeInstanceOf(BubbleCommitError);
    expect((normalized as BubbleCommitError).reasonCode).toBe(
      "REMOTE_STATUS_CONFIG_INVALID"
    );
    expect((normalized as Error).message).toContain("host mismatch");
  });

  it("preserves remote commit transport taxonomy on normalized commit errors", () => {
    const normalized = normalizeBubbleCommitError({
      error: new RemoteBubbleCommitCommandError({
        code: "REMOTE_COMMIT_TRANSPORT_FAILED",
        message: "ssh transport failed"
      }),
      isBubbleCommitError,
      createBubbleCommitError,
      isRemoteBubbleCommitCommandError: (candidate) =>
        candidate instanceof RemoteBubbleCommitCommandError
    });

    expect(normalized).toBeInstanceOf(BubbleCommitError);
    expect((normalized as BubbleCommitError).reasonCode).toBe(
      "REMOTE_COMMIT_TRANSPORT_FAILED"
    );
    expect((normalized as Error).message).toContain("ssh transport failed");
  });

  it("preserves remote commit payload taxonomy on normalized commit errors", () => {
    const normalized = normalizeBubbleCommitError({
      error: new RemoteBubbleCommitCommandError({
        code: "REMOTE_COMMIT_PAYLOAD_INVALID",
        message: "remote payload was malformed"
      }),
      isBubbleCommitError,
      createBubbleCommitError,
      isRemoteBubbleCommitCommandError: (candidate) =>
        candidate instanceof RemoteBubbleCommitCommandError
    });

    expect(normalized).toBeInstanceOf(BubbleCommitError);
    expect((normalized as BubbleCommitError).reasonCode).toBe(
      "REMOTE_COMMIT_PAYLOAD_INVALID"
    );
    expect((normalized as Error).message).toContain("remote payload was malformed");
  });
});
