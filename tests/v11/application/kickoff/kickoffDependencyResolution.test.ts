import { readFile, writeFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { resolveBubbleById } from "../../../../src/core/bubble/bubbleLookup.js";
import { appendProtocolEnvelope } from "../../../../src/core/protocol/transcriptStore.js";
import { emitTmuxDeliveryNotification } from "../../../../src/core/runtime/tmuxDelivery.js";
import { readStateSnapshot, writeStateSnapshot } from "../../../../src/v11/infrastructure/state/stateStore.js";
import { resolveKickoffDependencies } from "../../../../src/v11/shared/kickoff/kickoffDependencyResolution.js";

describe("kickoffDependencyResolution", () => {
  it("uses kickoff defaults when overrides are omitted", () => {
    const resolved = resolveKickoffDependencies({});

    expect(resolved.resolveBubble).toBe(resolveBubbleById);
    expect(resolved.readState).toBe(readStateSnapshot);
    expect(resolved.writeState).toBe(writeStateSnapshot);
    expect(resolved.readFileFn).toBe(readFile);
    expect(resolved.writeFileFn).toBe(writeFile);
    expect(resolved.appendEnvelope).toBe(appendProtocolEnvelope);
    expect(resolved.emitDelivery).toBe(emitTmuxDeliveryNotification);
  });

  it("uses provided kickoff overrides", () => {
    const resolveBubbleByIdOverride = async () => ({}) as never;
    const readStateSnapshotOverride = async () => ({}) as never;
    const writeStateSnapshotOverride = async () => ({}) as never;
    const readFileOverride = (async () => "x") as unknown as typeof readFile;
    const writeFileOverride = (async () => {}) as unknown as typeof writeFile;
    const appendProtocolEnvelopeOverride = async () => ({}) as never;
    const emitTmuxDeliveryNotificationOverride = async () => ({}) as never;

    const resolved = resolveKickoffDependencies({
      resolveBubbleById: resolveBubbleByIdOverride,
      readStateSnapshot: readStateSnapshotOverride,
      writeStateSnapshot: writeStateSnapshotOverride,
      readFile: readFileOverride,
      writeFile: writeFileOverride,
      appendProtocolEnvelope: appendProtocolEnvelopeOverride,
      emitTmuxDeliveryNotification: emitTmuxDeliveryNotificationOverride
    });

    expect(resolved.resolveBubble).toBe(resolveBubbleByIdOverride);
    expect(resolved.readState).toBe(readStateSnapshotOverride);
    expect(resolved.writeState).toBe(writeStateSnapshotOverride);
    expect(resolved.readFileFn).toBe(readFileOverride);
    expect(resolved.writeFileFn).toBe(writeFileOverride);
    expect(resolved.appendEnvelope).toBe(appendProtocolEnvelopeOverride);
    expect(resolved.emitDelivery).toBe(emitTmuxDeliveryNotificationOverride);
  });
});
