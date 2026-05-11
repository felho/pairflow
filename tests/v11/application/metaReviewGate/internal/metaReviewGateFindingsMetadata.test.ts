import { describe, expect, it } from "vitest";

import {
  resolveFindingsArtifactPath
} from "../../../../../src/v11/application/metaReviewGate/metaReviewGateFindingsMetadata.js";
describe("resolveFindingsArtifactPath", () => {
  it("resolves artifact refs under artifacts", () => {
    expect(
      resolveFindingsArtifactPath({
        bubbleDir: "/repo/.pairflow/bubbles/b-1",
        artifactsDir: "/repo/.pairflow/bubbles/b-1/artifacts",
        artifactRef: "artifacts/findings.json"
      })
    ).toBe("/repo/.pairflow/bubbles/b-1/artifacts/findings.json");
  });

  it("rejects refs outside artifacts", () => {
    expect(
      resolveFindingsArtifactPath({
        bubbleDir: "/repo/.pairflow/bubbles/b-1",
        artifactsDir: "/repo/.pairflow/bubbles/b-1/artifacts",
        artifactRef: "logs/findings.json"
      })
    ).toBeUndefined();
    expect(
      resolveFindingsArtifactPath({
        bubbleDir: "/repo/.pairflow/bubbles/b-1",
        artifactsDir: "/repo/.pairflow/bubbles/b-1/artifacts",
        artifactRef: "artifacts/../state.json"
      })
    ).toBeUndefined();
    expect(
      resolveFindingsArtifactPath({
        bubbleDir: "/repo/.pairflow/bubbles/b-1",
        artifactsDir: "/repo/.pairflow/bubbles/b-1/artifacts",
        artifactRef: "artifacts\\findings.json"
      })
    ).toBeUndefined();
    expect(
      resolveFindingsArtifactPath({
        bubbleDir: "/repo/.pairflow/bubbles/b-1",
        artifactsDir: "/repo/.pairflow/bubbles/b-1/artifacts",
        artifactRef: "artifacts/findings.json\0"
      })
    ).toBeUndefined();
  });

  it("rejects resolved paths that escape the configured artifacts directory", () => {
    expect(
      resolveFindingsArtifactPath({
        bubbleDir: "/repo/.pairflow/other-bubble",
        artifactsDir: "/repo/.pairflow/bubbles/b-1/artifacts",
        artifactRef: "artifacts/findings.json"
      })
    ).toBeUndefined();
  });
});
