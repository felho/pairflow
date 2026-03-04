import { describe, expect, it } from "vitest";

import { buildReviewerAgentSelectionGuidance } from "../../../src/core/runtime/reviewerGuidance.js";

describe("buildReviewerAgentSelectionGuidance", () => {
  it("adds runtime-check exemption guidance for document scope", () => {
    const guidance = buildReviewerAgentSelectionGuidance("document");

    expect(guidance).toContain("document/task artifacts");
    expect(guidance).toContain("Runtime checks are not required for document-only scope.");
  });

  it("keeps code guidance unchanged", () => {
    const guidance = buildReviewerAgentSelectionGuidance("code");

    expect(guidance).toContain("primarily targets code changes");
    expect(guidance).not.toContain("Runtime checks are not required for document-only scope.");
  });

  it("keeps auto guidance unchanged", () => {
    const guidance = buildReviewerAgentSelectionGuidance("auto");

    expect(guidance).toContain("Choose review mode by deliverable type");
    expect(guidance).not.toContain("Runtime checks are not required for document-only scope.");
  });
});
