import { describe, expect, it } from "vitest";

import { normalizeStartupReconcilerError } from "../../../../../../src/v11/application/reconcile/internal/error/reconcileCommandErrorNormalization.js";
import {
  createStartupReconcilerError,
  StartupReconcilerError
} from "../../../../../../src/v11/application/reconcile/internal/error/reconcileCommandRuntime.js";

describe("reconcileCommandErrorNormalization", () => {
  it("preserves startup reconciler errors", () => {
    const original = new StartupReconcilerError("already-normalized");
    const normalized = normalizeStartupReconcilerError({
      error: original,
      isStartupReconcilerError: (candidate) =>
        candidate instanceof StartupReconcilerError,
      createStartupReconcilerError,
      isError: (candidate): candidate is Error => candidate instanceof Error
    });

    expect(normalized).toBe(original);
  });

  it("maps generic errors to startup reconciler errors", () => {
    const normalized = normalizeStartupReconcilerError({
      error: new Error("repo lookup failed"),
      isStartupReconcilerError: (candidate) =>
        candidate instanceof StartupReconcilerError,
      createStartupReconcilerError,
      isError: (candidate): candidate is Error => candidate instanceof Error
    });

    expect(normalized).toBeInstanceOf(StartupReconcilerError);
    expect((normalized as Error).message).toBe("repo lookup failed");
  });
});
