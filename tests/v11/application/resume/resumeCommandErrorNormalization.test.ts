import { describe, expect, it } from "vitest";

import {
  ResumeBubbleError,
  createResumeBubbleError
} from "../../../../src/v11/application/resume/internal/error/resumeCommandRuntime.js";
import { normalizeResumeBubbleError } from "../../../../src/v11/application/resume/internal/error/resumeCommandErrorNormalization.js";

describe("resumeCommandErrorNormalization", () => {
  it("preserves existing ResumeBubbleError", () => {
    const original = new ResumeBubbleError("already-normalized");
    const normalized = normalizeResumeBubbleError({
      error: original,
      isResumeBubbleError: (candidate) => candidate instanceof ResumeBubbleError,
      asHumanReplyCommandError: () => {
        throw new Error("should not be called");
      },
      createResumeBubbleError
    });

    expect(normalized).toBe(original);
  });

  it("maps normalized human reply errors to ResumeBubbleError", () => {
    const normalized = normalizeResumeBubbleError({
      error: new Error("root"),
      isResumeBubbleError: (candidate) => candidate instanceof ResumeBubbleError,
      asHumanReplyCommandError: () => {
        throw new Error("bubble reply can only be used while bubble is WAITING_HUMAN");
      },
      createResumeBubbleError
    });

    expect(normalized).toBeInstanceOf(ResumeBubbleError);
    expect((normalized as Error).message).toMatch(/WAITING_HUMAN/u);
  });
});
