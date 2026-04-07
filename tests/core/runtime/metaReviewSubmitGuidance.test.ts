import { describe, expect, it } from "vitest";

import {
  buildMetaReviewSubmitCommandTemplate,
  buildMetaReviewSubmitUsageLine
} from "../../../src/core/runtime/metaReviewSubmitGuidance.js";
import { getBubbleMetaReviewHelpText } from "../../../src/v11/application/metaReview/metaReviewCliOptions.js";
import { buildMetaReviewerStartupPrompt } from "../../../src/v11/application/start/startCommandPrompts.js";

describe("metaReviewSubmitGuidance", () => {
  it("keeps startup prompt aligned with the shared submit command contract", () => {
    const prompt = buildMetaReviewerStartupPrompt({
      bubbleId: "bubble_demo",
      repoPath: "/tmp/repo",
      worktreePath: "/tmp/repo/.pairflow-worktrees/bubble_demo",
      taskArtifactPath: "/tmp/repo/.pairflow/bubbles/bubble_demo/artifacts/task.md",
      pairflowCommandProfile: "external"
    });

    expect(prompt).toContain(buildMetaReviewSubmitCommandTemplate());
    expect(prompt).not.toContain("--report-markdown");
    expect(prompt).toContain("`P0`, `P1`, `P2`, `P3`");
    expect(prompt).toContain("Do not emit alias severities such as `blocking` or `advisory`");
  });

  it("keeps CLI help aligned with the shared submit usage line", () => {
    const helpText = getBubbleMetaReviewHelpText();

    expect(helpText).toContain(buildMetaReviewSubmitUsageLine());
    expect(helpText).not.toContain("--report-markdown");
  });
});
