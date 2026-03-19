import { describe, expect, it } from "vitest";

import {
  asConvergedCommandError,
  ConvergedCommandError,
  emitConvergedFromWorkspace,
  resolveMetaReviewRolloutBlockingReasonCodes
} from "../../../../src/core/agent/converged.js";
import {
  asConvergedCommandErrorV11,
  ConvergedCommandErrorV11,
  emitConvergedFromWorkspaceV11,
  resolveMetaReviewRolloutBlockingReasonCodesV11
} from "../../../../src/v11/application/converged/emitConvergedV11.js";

describe("converged facade parity", () => {
  it("keeps core runtime exports aligned with v11 facade exports", () => {
    expect(emitConvergedFromWorkspace).toBe(emitConvergedFromWorkspaceV11);
    expect(asConvergedCommandError).toBe(asConvergedCommandErrorV11);
    expect(ConvergedCommandError).toBe(ConvergedCommandErrorV11);
    expect(resolveMetaReviewRolloutBlockingReasonCodes).toBe(
      resolveMetaReviewRolloutBlockingReasonCodesV11
    );
  });
});
