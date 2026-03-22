import { describe, expect, it } from "vitest";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (input.reasonCode !== undefined ? input.reasonCode + ": " : "") + input.message;
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
        expect(message).toContain("reason_code=DOCS_ONLY_SKIP_LOG_REF_CONFLICT");
        expect(message).toContain("conflicting_ref_count=3");
        expect(message).toContain("ref_class=runtime_log_ref");
        expect(message).toContain("ref_pattern=^\\.pairflow/evidence/[^\\s]+\\.log$");
        expect(message).toContain(
          "example_refs=.pairflow/evidence/lint.log,.pairflow/evidence/test.log,.pairflow/evidence/subdir/build.log"
        );
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
        expect(message).toContain("conflicting_ref_count=4");
        expect(message).toContain(
          "example_refs=.pairflow/evidence/lint.log,.pairflow/evidence/typecheck.log,.pairflow/evidence/test.log"
        );
        expect(message).not.toContain(".pairflow/evidence/subdir/build.log");
      }
    );
  });
});
