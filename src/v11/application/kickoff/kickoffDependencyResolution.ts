import { readFile, stat, writeFile } from "node:fs/promises";

import { appendProtocolEnvelope } from "../../../core/protocol/transcriptStore.js";
import { emitTmuxDeliveryNotification } from "../../../core/runtime/tmuxDelivery.js";
import { readStateSnapshot, writeStateSnapshot } from "../../../core/state/stateStore.js";
import { resolveBubbleById } from "../../../core/bubble/bubbleLookup.js";
import type {
  KickoffDependencyOverrides,
  ResolvedKickoffDependencies
} from "../../shared/kickoff/kickoffDependencyContract.js";

function buildKickoffDefaultDependencies(): ResolvedKickoffDependencies {
  return {
    resolveBubble: resolveBubbleById,
    readState: readStateSnapshot,
    writeState: writeStateSnapshot,
    readFileFn: readFile,
    statFileFn: stat,
    writeFileFn: writeFile,
    appendEnvelope: appendProtocolEnvelope,
    emitDelivery: emitTmuxDeliveryNotification
  };
}

export function resolveKickoffDependencies(
  overrides: KickoffDependencyOverrides
): ResolvedKickoffDependencies {
  const defaults = buildKickoffDefaultDependencies();
  return {
    resolveBubble: overrides.resolveBubbleById ?? defaults.resolveBubble,
    readState: overrides.readStateSnapshot ?? defaults.readState,
    writeState: overrides.writeStateSnapshot ?? defaults.writeState,
    readFileFn: overrides.readFile ?? defaults.readFileFn,
    statFileFn: overrides.statFile ?? defaults.statFileFn,
    writeFileFn: overrides.writeFile ?? defaults.writeFileFn,
    appendEnvelope: overrides.appendProtocolEnvelope ?? defaults.appendEnvelope,
    emitDelivery: overrides.emitTmuxDeliveryNotification ?? defaults.emitDelivery
  };
}
