import { readFile, stat, writeFile } from "node:fs/promises";

import { kickoffDefaults } from "../../../core/bubble/kickoffDefaults.js";
import type {
  KickoffDependencyOverrides,
  ResolvedKickoffDependencies
} from "../../shared/kickoff/kickoffDependencyContract.js";

function buildKickoffDefaultDependencies(): ResolvedKickoffDependencies {
  return {
    resolveBubble: kickoffDefaults.resolveBubbleById,
    readState: kickoffDefaults.readStateSnapshot,
    writeState: kickoffDefaults.writeStateSnapshot,
    readFileFn: readFile,
    statFileFn: stat,
    writeFileFn: writeFile,
    appendEnvelope: kickoffDefaults.appendProtocolEnvelope,
    emitDelivery: kickoffDefaults.emitTmuxDeliveryNotification
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
