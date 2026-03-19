import { describe, expect, it } from "vitest";

import {
  asStartupReconcilerError,
  reconcileRuntimeSessions,
  StartupReconcilerError
} from "../../../../src/core/runtime/startupReconciler.js";
import {
  asStartupReconcilerErrorV11,
  reconcileRuntimeSessionsV11,
  StartupReconcilerErrorV11
} from "../../../../src/v11/application/reconcile/emitReconcileV11.js";

describe("reconcile facade parity", () => {
  it("keeps core reconcile exports aligned with v11 source-of-truth exports", () => {
    expect(reconcileRuntimeSessions).toBe(reconcileRuntimeSessionsV11);
    expect(asStartupReconcilerError).toBe(asStartupReconcilerErrorV11);
    expect(StartupReconcilerError).toBe(StartupReconcilerErrorV11);
  });
});
