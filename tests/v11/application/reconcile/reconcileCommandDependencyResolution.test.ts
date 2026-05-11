import { describe, expect, it } from "vitest";

import type { RuntimeSessionsRegistry } from "../../../../src/v11/infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import type { ReconcileRuntimeSessionsDefaultDependencies } from "../../../../src/v11/application/reconcile/reconcileCommandContract.js";
import { resolveReconcileRuntimeSessionsDependencies } from "../../../../src/v11/application/reconcile/reconcileCommandDependencyResolution.js";

describe("reconcileCommandDependencyResolution", () => {
  it("preserves explicit dependency overrides", () => {
    const customResolveRepoPath = (async () => "/tmp/custom-repo") as never;
    const customPersistMarker = (async () =>
      ({
        persisted_targets: [],
        warnings: []
      })) as never;
    const customCountRegistryEntries = (
      registry: RuntimeSessionsRegistry
    ): number => Object.keys(registry).length + 41;
    const defaults: ReconcileRuntimeSessionsDefaultDependencies = {
      resolveRepoPath: async () => "/tmp/default-repo",
      readRuntimeSessionsRegistry: async () => ({}),
      removeRuntimeSessions: async () => ({
        removedBubbleIds: [],
        missingBubbleIds: []
      }),
      persistPassValidationRecoveryMarker: async () => ({
        persisted_targets: [],
        warnings: []
      }),
      readStateSnapshot: async () => {
        throw new Error("not used");
      },
      isTmuxSessionAlive: async () => false
    };

    const resolved = resolveReconcileRuntimeSessionsDependencies({
      resolveRepoPath: customResolveRepoPath,
      persistPassValidationRecoveryMarker: customPersistMarker,
      countRegistryEntries: customCountRegistryEntries
    }, defaults);

    expect(resolved.resolveRepoPath).toBe(customResolveRepoPath);
    expect(resolved.persistPassValidationRecoveryMarker).toBe(customPersistMarker);
    expect(resolved.countRegistryEntries).toBe(customCountRegistryEntries);
  });
});
