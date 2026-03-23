import { describe, expect, it } from "vitest";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (
    (input.reasonCode !== undefined ? input.reasonCode + ": " : "")
    + input.message
    + (input.context !== undefined ? ` context=${JSON.stringify(input.context)}` : "")
  );
}

import { assertNoDocsOnlySkipLogRefConflict } from "../../../../src/v11/domain/pass/docsOnlyRuntimeSkipGuard.js";

class TestDocsOnlyRuntimeSkipGuardError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "TestDocsOnlyRuntimeSkipGuardError";
  }
}

function createError(message: PairflowCommandErrorInput): Error {
  return new TestDocsOnlyRuntimeSkipGuardError(toErrorMessage(message));
}

function parseContextFromMessage(message: string): Record<string, unknown> {
  const marker = " context=";
  const markerIndex = message.indexOf(marker);
  if (markerIndex < 0) {
    return {};
  }
  const raw = message.slice(markerIndex + marker.length);
  const parsed: unknown = JSON.parse(raw);
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {};
  }
  return parsed as Record<string, unknown>;
}

function expectGuardError(
  action: () => void,
  assertion: (message: string) => void
): void {
  try {
    action();
    throw new Error("expected docs-only runtime skip guard error");
  } catch (error) {
    expect(error).toBeInstanceOf(TestDocsOnlyRuntimeSkipGuardError);
    const message = error instanceof Error ? error.message : String(error);
    assertion(message);
  }
}

describe("assertNoDocsOnlySkipLogRefConflict", () => {
  it("skips guard outside document review scope", () => {
    expect(() =>
      assertNoDocsOnlySkipLogRefConflict({
        reviewArtifactType: "code",
        senderRole: "implementer",
        summary: "Runtime checks intentionally not executed for docs-only scope.",
        refs: [".pairflow/evidence/lint.log"],
        createError
      })
    ).not.toThrow();
  });

  it("skips guard for reviewer sender", () => {
    expect(() =>
      assertNoDocsOnlySkipLogRefConflict({
        reviewArtifactType: "document",
        senderRole: "reviewer",
        summary: "Runtime checks intentionally not executed for docs-only scope.",
        refs: [".pairflow/evidence/lint.log"],
        createError
      })
    ).not.toThrow();
  });

  it("skips guard when runtime-skip marker is missing", () => {
    expect(() =>
      assertNoDocsOnlySkipLogRefConflict({
        reviewArtifactType: "document",
        senderRole: "implementer",
        summary: "General handoff summary without runtime marker.",
        refs: [".pairflow/evidence/lint.log"],
        createError
      })
    ).not.toThrow();
  });

  it("skips guard when refs do not contain runtime log refs", () => {
    expect(() =>
      assertNoDocsOnlySkipLogRefConflict({
        reviewArtifactType: "document",
        senderRole: "implementer",
        summary: "Runtime checks intentionally not executed in docs-only scope.",
        refs: [
          "artifact://handoff.md",
          ".pairflow/evidence/lint.log.bak",
          ".pairflow/evidence/with space.log"
        ],
        createError
      })
    ).not.toThrow();
  });

  it("throws deterministic diagnostics with normalized marker matching", () => {
    expectGuardError(
      () =>
        assertNoDocsOnlySkipLogRefConflict({
          reviewArtifactType: "document",
          senderRole: "implementer",
          summary: "Runtime   checks   WERE intentionally   not executed in docs-only scope.",
          refs: [
            "artifact://handoff.md",
            ".pairflow/evidence/lint.log",
            ".pairflow/evidence/test.log",
            ".pairflow/evidence/subdir/build.log",
            ".pairflow/evidence/test.log.bak"
          ],
          createError
        }),
      (message) => {
        expect(message).toMatch(/^DOCS_ONLY_SKIP_LOG_REF_CONFLICT:/u);
        const context = parseContextFromMessage(message);
        expect(context).toMatchObject({
          guard: "docs_only_runtime_skip_guard",
          conflicting_ref_count: 3,
          ref_class: "runtime_log_ref",
          ref_pattern: "^\\.pairflow/evidence/[^\\s]+\\.log$",
          example_refs:
            ".pairflow/evidence/lint.log,.pairflow/evidence/test.log,.pairflow/evidence/subdir/build.log"
        });
      }
    );
  });

  it("samples at most three refs in diagnostics while preserving full conflict count", () => {
    expectGuardError(
      () =>
        assertNoDocsOnlySkipLogRefConflict({
          reviewArtifactType: "document",
          senderRole: "implementer",
          summary: "Runtime checks intentionally not executed for docs-only scope.",
          refs: [
            ".pairflow/evidence/lint.log",
            ".pairflow/evidence/typecheck.log",
            ".pairflow/evidence/test.log",
            ".pairflow/evidence/subdir/build.log"
          ],
          createError
        }),
      (message) => {
        const context = parseContextFromMessage(message);
        expect(context).toMatchObject({
          conflicting_ref_count: 4,
          example_refs:
            ".pairflow/evidence/lint.log,.pairflow/evidence/typecheck.log,.pairflow/evidence/test.log"
        });
        const exampleRefs =
          typeof context.example_refs === "string"
            ? context.example_refs
            : "";
        expect(exampleRefs).toContain(".pairflow/evidence/lint.log");
        expect(exampleRefs).toContain(".pairflow/evidence/typecheck.log");
        expect(exampleRefs).toContain(".pairflow/evidence/test.log");
        expect(exampleRefs).not.toContain(".pairflow/evidence/subdir/build.log");
      }
    );
  });
});
