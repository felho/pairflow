import { readFile, writeFile } from "node:fs/promises";

import { appendProtocolEnvelope } from "../../../v11/infrastructure/artifact/transcript/transcriptStore.js";
import { emitTmuxDeliveryNotification } from "../../infrastructure/channel/tmux/tmuxDelivery.js";
import { readStateSnapshot, writeStateSnapshot } from "../../infrastructure/state/stateStore.js";
import { resolveBubbleById } from "../../infrastructure/executor/workspace/bubbleLookup.js";

export interface KickoffDependencyOverrides {
  resolveBubbleById?: typeof resolveBubbleById;
  readStateSnapshot?: typeof readStateSnapshot;
  writeStateSnapshot?: typeof writeStateSnapshot;
  readFile?: typeof readFile;
  writeFile?: typeof writeFile;
  appendProtocolEnvelope?: typeof appendProtocolEnvelope;
  emitTmuxDeliveryNotification?: typeof emitTmuxDeliveryNotification;
}

export interface ResolvedKickoffDependencies {
  resolveBubble: typeof resolveBubbleById;
  readState: typeof readStateSnapshot;
  writeState: typeof writeStateSnapshot;
  readFileFn: typeof readFile;
  writeFileFn: typeof writeFile;
  appendEnvelope: typeof appendProtocolEnvelope;
  emitDelivery: typeof emitTmuxDeliveryNotification;
}

function buildKickoffDefaultDependencies(): ResolvedKickoffDependencies {
  return {
    resolveBubble: resolveBubbleById,
    readState: readStateSnapshot,
    writeState: writeStateSnapshot,
    readFileFn: readFile,
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
    writeFileFn: overrides.writeFile ?? defaults.writeFileFn,
    appendEnvelope: overrides.appendProtocolEnvelope ?? defaults.appendEnvelope,
    emitDelivery: overrides.emitTmuxDeliveryNotification ?? defaults.emitDelivery
  };
}
