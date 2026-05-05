import { describe, expect, it } from "vitest";

import { normalizeReconcileRuntimeSessionsInput } from "../../../../src/v11/application/reconcile/reconcileCommandInputNormalization.js";

describe("reconcileCommandInputNormalization", () => {
  it("applies default dryRun and tmux liveness probe", () => {
    const defaultProbe = async () => false;
    const normalized = normalizeReconcileRuntimeSessionsInput(
      {},
      {
        isTmuxSessionAlive: defaultProbe
      }
    );

    expect(normalized.dryRun).toBe(false);
    expect(normalized.isTmuxSessionAlive).toBe(defaultProbe);
  });

  it("preserves explicit values", async () => {
    const customProbe = async () => true;
    const normalized = normalizeReconcileRuntimeSessionsInput(
      {
        repoPath: "/tmp/repo",
        cwd: "/tmp",
        dryRun: true,
        isTmuxSessionAlive: customProbe
      },
      {
        isTmuxSessionAlive: async () => false
      }
    );

    expect(normalized.repoPath).toBe("/tmp/repo");
    expect(normalized.cwd).toBe("/tmp");
    expect(normalized.dryRun).toBe(true);
    await expect(normalized.isTmuxSessionAlive("pf-b_reconcile_01")).resolves.toBe(
      true
    );
  });
});
