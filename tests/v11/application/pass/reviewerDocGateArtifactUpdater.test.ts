import { describe, expect, it } from "vitest";

import {
  createDocGateReadFailureWarning,
  extractTaskContentFromTaskArtifact
} from "../../../../src/v11/application/pass/reviewerDocGateArtifactUpdater.js";

describe("extractTaskContentFromTaskArtifact", () => {
  it("extracts task body from bubble task artifact template", () => {
    const content = [
      "# Bubble Task",
      "",
      "Source: docs/example.md",
      "",
      "Implement step A",
      "Implement step B"
    ].join("\n");

    expect(extractTaskContentFromTaskArtifact(content)).toBe(
      ["Implement step A", "Implement step B"].join("\n")
    );
  });

  it("returns original content for non-template input", () => {
    const content = "free-form task content";
    expect(extractTaskContentFromTaskArtifact(content)).toBe(content);
  });
});

describe("createDocGateReadFailureWarning", () => {
  it("creates canonical fail-open warning payload", () => {
    const warning = createDocGateReadFailureWarning({
      artifactPath: "/tmp/doc-gate.json",
      reason: "ENOENT"
    });

    expect(warning).toMatchObject({
      gate_id: "review.serialization",
      reason_code: "STATUS_GATE_SERIALIZATION_WARNING",
      priority: "P2",
      timing: "later-hardening",
      layer: "L1",
      signal_level: "warning",
      evidence_refs: ["/tmp/doc-gate.json"]
    });
    expect(warning.message).toContain("reason=ENOENT");
  });
});
