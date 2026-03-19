import { describe, expect, it } from "vitest";

import {
  asResumeBubbleError,
  DEFAULT_RESUME_MESSAGE,
  ResumeBubbleError,
  resumeBubble
} from "../../../../src/core/bubble/resumeBubble.js";
import {
  asResumeBubbleErrorV11,
  DEFAULT_RESUME_MESSAGE as DEFAULT_RESUME_MESSAGE_V11,
  ResumeBubbleErrorV11,
  resumeBubbleV11
} from "../../../../src/v11/application/resume/emitResumeV11.js";

describe("resume facade parity", () => {
  it("keeps core resume exports aligned with v11 source-of-truth exports", () => {
    expect(resumeBubble).toBe(resumeBubbleV11);
    expect(asResumeBubbleError).toBe(asResumeBubbleErrorV11);
    expect(ResumeBubbleError).toBe(ResumeBubbleErrorV11);
    expect(DEFAULT_RESUME_MESSAGE).toBe(DEFAULT_RESUME_MESSAGE_V11);
  });
});
