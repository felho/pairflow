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
} from "../../../src/core/runtime/reviewerSeverityOntology.generated.js";
import { buildReviewerSeverityOntologyReminder } from "../../../src/core/runtime/reviewerSeverityOntology.js";

describe("buildReviewerSeverityOntologyReminder", () => {
  it("uses generated canonical ontology content", () => {
    const reminder = buildReviewerSeverityOntologyReminder({
      includeFullOntology: true
    });

    expect(reviewerSeverityOntologyRuntimeBlockMarkdown).toContain(
      "Blocker severities (`P0/P1`) require concrete evidence"
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
      "Any `P0/P1` present: reviewer should request a fix cycle."
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
});
