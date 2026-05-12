import { readFile, writeFile } from "node:fs/promises";

import { describe, expect, it, vi } from "vitest";

import { reviewerDeliveryDefaults } from "../../../../src/v11/application/pass/reviewerDeliveryDefaults.js";
import {
  appendProtocolEnvelope,
  resolveBubbleById
} from "../../../../src/v11/application/start/startCommandDependencyDefaults.js";
import { resolveKickoffDependencies } from "../../../../src/v11/application/kickoff/internal/validation/kickoffDependencyResolution.js";
import { createInitialBubbleState } from "../../../../src/v11/domain/state/initialState.js";
import { toPersistedSnapshot } from "../../../../src/v11/domain/state/snapshot/projection.js";

describe("kickoffDependencyResolution", () => {
  it("uses kickoff defaults when overrides are omitted", () => {
    const resolved = resolveKickoffDependencies({});

    expect(resolved.resolveBubble).toBe(resolveBubbleById);
    // readState / writeState are wrapped by the variant-adapter at the
    // dependency-resolution boundary (Step 4b-β kickoff lane). Identity
    // comparison is no longer meaningful; behavioral coverage lives in
    // the explicit "delegates through the variant adapter" test below.
    expect(typeof resolved.readState).toBe("function");
    expect(typeof resolved.writeState).toBe("function");
    expect(resolved.readFileFn).toBe(readFile);
    expect(resolved.writeFileFn).toBe(writeFile);
    expect(resolved.appendEnvelope).toBe(appendProtocolEnvelope);
    expect(resolved.emitDelivery).toBe(
      reviewerDeliveryDefaults.emitDeliveryNotificationAck
    );
  });

  it("uses provided kickoff overrides", () => {
    const resolveBubbleByIdOverride = async () => ({}) as never;
    const readStateSnapshotOverride = async () => ({}) as never;
    const writeStateSnapshotOverride = async () => ({}) as never;
    const readFileOverride = (async () => "x") as unknown as typeof readFile;
    const writeFileOverride = (async () => {}) as unknown as typeof writeFile;
    const appendProtocolEnvelopeOverride = async () => ({}) as never;
    const emitDeliveryNotificationAckOverride = async () => ({}) as never;

    const resolved = resolveKickoffDependencies({
      resolveBubbleById: resolveBubbleByIdOverride,
      readStateSnapshot: readStateSnapshotOverride,
      writeStateSnapshot: writeStateSnapshotOverride,
      readFile: readFileOverride,
      writeFile: writeFileOverride,
      appendProtocolEnvelope: appendProtocolEnvelopeOverride,
      emitDeliveryNotificationAck: emitDeliveryNotificationAckOverride
    });

    expect(resolved.resolveBubble).toBe(resolveBubbleByIdOverride);
    // readState / writeState overrides are wrapped — see behavioral test below.
    expect(typeof resolved.readState).toBe("function");
    expect(typeof resolved.writeState).toBe("function");
    expect(resolved.readFileFn).toBe(readFileOverride);
    expect(resolved.writeFileFn).toBe(writeFileOverride);
    expect(resolved.appendEnvelope).toBe(appendProtocolEnvelopeOverride);
    expect(resolved.emitDelivery).toBe(emitDeliveryNotificationAckOverride);
  });

  it("forwards the canonical kickoff delivery override", () => {
    const emitDeliveryNotificationAckOverride = async () => ({}) as never;

    const resolved = resolveKickoffDependencies({
      emitDeliveryNotificationAck: emitDeliveryNotificationAckOverride
    });

    expect(resolved.emitDelivery).toBe(emitDeliveryNotificationAckOverride);
  });

  it("delegates state read/write through the variant adapter to the override", async () => {
    const persistedSnapshot = toPersistedSnapshot(
      createInitialBubbleState("b_kickoff_dep_resolution_adapter")
    );
    const readStateSnapshotOverride = vi.fn(async () => ({
      state: persistedSnapshot,
      fingerprint: "fp-read"
    }));
    const writeStateSnapshotOverride = vi.fn(async () => ({
      state: persistedSnapshot,
      fingerprint: "fp-write"
    }));

    const resolved = resolveKickoffDependencies({
      readStateSnapshot: readStateSnapshotOverride,
      writeStateSnapshot: writeStateSnapshotOverride
    });

    const readResult = await resolved.readState("/tmp/state.json");
    expect(readStateSnapshotOverride).toHaveBeenCalledWith("/tmp/state.json");
    expect(readResult.fingerprint).toBe("fp-read");
    expect(readResult.state.kind).toBe("inactive_initial");

    const writeResult = await resolved.writeState(
      "/tmp/state.json",
      readResult.state,
      { expectedFingerprint: "fp-read" }
    );
    expect(writeStateSnapshotOverride).toHaveBeenCalledTimes(1);
    expect(writeStateSnapshotOverride).toHaveBeenCalledWith(
      "/tmp/state.json",
      // The persisted projection strips the variant kind discriminator.
      expect.not.objectContaining({ kind: "inactive_initial" }),
      { expectedFingerprint: "fp-read" }
    );
    expect(writeResult.fingerprint).toBe("fp-write");
    expect(writeResult.state.kind).toBe("inactive_initial");
  });
});
