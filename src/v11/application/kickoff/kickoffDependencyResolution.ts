import { readFile, stat, writeFile } from "node:fs/promises";

import {
  appendProtocolEnvelope
} from "../../infrastructure/artifact/transcript/transcriptStore.js";
import {
  emitTmuxDeliveryNotification
} from "../../infrastructure/channel/tmux/tmuxDelivery.js";
import {
  resolveBubbleById
} from "../../infrastructure/executor/workspace/bubbleLookup.js";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../../infrastructure/state/stateStore.js";
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
