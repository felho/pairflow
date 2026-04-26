import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  reviewerSeverityOntologyFullMarkdown,
  reviewerSeverityOntologyFullPromptText,
  reviewerSeverityOntologyRuntimeBlockMarkdown,
  reviewerSeverityOntologyRuntimeReminderText,
  reviewerSeverityOntologySourceDoc
} from "../../../src/v11/shared/reviewer/reviewerSeverityOntology.generated.js";
import { buildReviewerSeverityOntologyReminder } from "../../../src/v11/shared/reviewer/reviewerSeverityOntology.js";

describe("buildReviewerSeverityOntologyReminder", () => {
  it("uses generated canonical ontology content", () => {
    const reminder = buildReviewerSeverityOntologyReminder({
      includeFullOntology: true
    });

    expect(reviewerSeverityOntologyRuntimeBlockMarkdown).toContain(
      "Blocker severities (`P0/P1`) require concrete evidence"
    );
    expect(reviewerSeverityOntologyRuntimeBlockMarkdown).toContain(
      "Post-gate reviewer routing is controlled by `review_policy.reviewer_blocking_min_severity`"
    );
    expect(reviewerSeverityOntologyRuntimeBlockMarkdown).toContain(
      "Default baseline `review_policy.reviewer_blocking_min_severity=P3`"
    );
    expect(reviewerSeverityOntologyRuntimeBlockMarkdown).toContain(
      "Out-of-scope observations should be notes (`P3`)"
    );
    expect(reviewerSeverityOntologyFullMarkdown).toContain(
      "# Reviewer Severity Ontology (v1)"
    );
    expect(reviewerSeverityOntologyFullMarkdown).toContain(
      "## Decision Mapping"
    );
    expect(reviewerSeverityOntologyFullPromptText).toContain(
      "Reviewer Severity Ontology (v1)"
    );
    expect(reviewerSeverityOntologyFullPromptText).toContain(
      "Round `>= severity_gate_round` with one or more findings that meet `review_policy.reviewer_blocking_min_severity` under scope policy: reviewer should request a fix cycle with canonical pass emit (`pairflow agent emit --kind pass ...`)."
    );
    expect(reviewerSeverityOntologyFullPromptText).toContain(
      "Document scope blocker-grade `P0/P1` still requires strict qualifiers (`timing=required-now` + `layer=L1`); without those qualifiers the finding is treated as `P2` for routing-threshold evaluation."
    );
    expect(reviewerSeverityOntologyFullPromptText).toContain(
      "Round `>= severity_gate_round` with only findings below the current threshold or clean result: reviewer should use canonical convergence emit (`pairflow agent emit --kind convergence ...`)."
    );
    expect(reviewerSeverityOntologyFullPromptText).not.toContain(
      "pairflow:runtime-reminder:start"
    );
    expect(reviewerSeverityOntologyFullPromptText).not.toContain(
      "pairflow:runtime-reminder:end"
    );
    expect(reminder).toContain(
      `embedded from canonical docs at build-time: \`${reviewerSeverityOntologySourceDoc}#runtime-reminder\``
    );
    expect(reminder).toContain(reviewerSeverityOntologyRuntimeReminderText);
    expect(reminder).toContain(
      `Full canonical ontology (embedded from \`${reviewerSeverityOntologySourceDoc}\`)`
    );
    expect(reminder).toContain(reviewerSeverityOntologyFullPromptText);
  });

  it("defaults to concise reminder output", () => {
    const reminder = buildReviewerSeverityOntologyReminder();

    expect(reminder).toContain(reviewerSeverityOntologyRuntimeReminderText);
    expect(reminder).not.toContain("Full canonical ontology");
    expect(reminder).not.toContain(reviewerSeverityOntologyFullPromptText);
  });

  it("supports concise reminder output for handoff delivery", () => {
    const reminder = buildReviewerSeverityOntologyReminder({
      includeFullOntology: false
    });

    expect(reminder).toContain(reviewerSeverityOntologyRuntimeReminderText);
    expect(reminder).not.toContain("Full canonical ontology");
    expect(reminder).not.toContain(reviewerSeverityOntologyFullPromptText);
    expect(reminder).not.toMatch(/[\r\n]/);
  });

  it("detects codegen staleness against canonical ontology markdown", async () => {
    const repoRoot = resolve(
      dirname(fileURLToPath(import.meta.url)),
      "../../.."
    );
    const canonicalDoc = await readFile(
      resolve(repoRoot, reviewerSeverityOntologySourceDoc),
      "utf8"
    );

    expect(reviewerSeverityOntologyFullMarkdown).toBe(canonicalDoc.trimEnd());
  });

  it("keeps the generated runtime block structurally anchored to the canonical marker slice", async () => {
    const repoRoot = resolve(
      dirname(fileURLToPath(import.meta.url)),
      "../../.."
    );
    const canonicalDoc = await readFile(
      resolve(repoRoot, reviewerSeverityOntologySourceDoc),
      "utf8"
    );
    const startMarker = "<!-- pairflow:runtime-reminder:start -->";
    const endMarker = "<!-- pairflow:runtime-reminder:end -->";
    const startIndex = canonicalDoc.indexOf(startMarker);
    const endIndex = canonicalDoc.indexOf(endMarker);

    expect(startIndex).toBeGreaterThanOrEqual(0);
    expect(endIndex).toBeGreaterThan(startIndex);

    const canonicalRuntimeBlock = canonicalDoc
      .slice(startIndex + startMarker.length, endIndex)
      .trim();

    expect(reviewerSeverityOntologyRuntimeBlockMarkdown).toBe(
      canonicalRuntimeBlock
    );
  });
});
