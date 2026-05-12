import { readFile, stat, writeFile } from "node:fs/promises";

import {
  appendProtocolEnvelope,
  readStateSnapshot,
  resolveBubbleById,
  writeStateSnapshot
} from "../../../start/startCommandDependencyDefaults.js";
import {
  reviewerDeliveryDefaults
} from "../../../pass/reviewerDeliveryDefaults.js";
import {
} from "../../../../shared/mutation/mutationBoundaryIO.js";
import type {
  KickoffDependencyOverrides,
  ResolvedKickoffDependencies
} from "./kickoffDependencyContract.js";

function buildKickoffDefaultDependencies(): ResolvedKickoffDependencies {
  return {
    resolveBubble: resolveBubbleById,
    readState: readStateSnapshot,
    writeState: writeStateSnapshot,
    readFileFn: readFile,
    statFileFn: stat,
    writeFileFn: writeFile,
    appendEnvelope: appendProtocolEnvelope,
    emitDelivery: reviewerDeliveryDefaults.emitDeliveryNotificationAck
  };
}

export function resolveKickoffDependencies(
  overrides: KickoffDependencyOverrides
): ResolvedKickoffDependencies {
  const defaults = buildKickoffDefaultDependencies();
  return {
    resolveBubble: overrides.resolveBubbleById ?? defaults.resolveBubble,
    readState:
      overrides.readStateSnapshot !== undefined
        ? overrides.readStateSnapshot
        : defaults.readState,
    writeState:
      overrides.writeStateSnapshot !== undefined
        ? overrides.writeStateSnapshot
        : defaults.writeState,
    readFileFn: overrides.readFile ?? defaults.readFileFn,
    statFileFn: overrides.statFile ?? defaults.statFileFn,
    writeFileFn: overrides.writeFile ?? defaults.writeFileFn,
    appendEnvelope: overrides.appendProtocolEnvelope ?? defaults.appendEnvelope,
    emitDelivery:
      overrides.emitDeliveryNotificationAck
      ?? defaults.emitDelivery
  };
}
