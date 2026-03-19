import { describe, expect, it } from "vitest";

import {
  asPassCommandError,
  emitPassFromWorkspace,
  inferPassIntent,
  PassCommandError,
  resolveMostRecentPreviousReviewerPassIsCleanFromMetadata
} from "../../../../src/core/agent/pass.js";
import {
  asPassCommandErrorV11,
  emitPassFromWorkspaceV11,
  inferPassIntentV11,
  PassCommandErrorV11
} from "../../../../src/v11/application/pass/emitPassV11.js";
import { resolveMostRecentPreviousReviewerPassIsCleanFromMetadata as resolveMostRecentPreviousReviewerPassIsCleanFromMetadataV11 } from "../../../../src/v11/domain/pass/repeatCleanMetadata.js";

describe("pass facade parity", () => {
  it("keeps core pass exports aligned with v11 source-of-truth exports", () => {
    expect(emitPassFromWorkspace).toBe(emitPassFromWorkspaceV11);
    expect(asPassCommandError).toBe(asPassCommandErrorV11);
    expect(inferPassIntent).toBe(inferPassIntentV11);
    expect(PassCommandError).toBe(PassCommandErrorV11);
    expect(resolveMostRecentPreviousReviewerPassIsCleanFromMetadata).toBe(
      resolveMostRecentPreviousReviewerPassIsCleanFromMetadataV11
    );
  });
});
