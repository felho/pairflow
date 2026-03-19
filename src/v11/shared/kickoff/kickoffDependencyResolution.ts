import { readFile, writeFile } from "node:fs/promises";

import { appendProtocolEnvelope } from "../../../core/protocol/transcriptStore.js";
import { readStateSnapshot, writeStateSnapshot } from "../../../core/state/stateStore.js";
import { resolveBubbleById } from "../../../core/bubble/bubbleLookup.js";

export interface KickoffDependencyOverrides {
  resolveBubbleById?: typeof resolveBubbleById;
  readStateSnapshot?: typeof readStateSnapshot;
  writeStateSnapshot?: typeof writeStateSnapshot;
  readFile?: typeof readFile;
  writeFile?: typeof writeFile;
  appendProtocolEnvelope?: typeof appendProtocolEnvelope;
}

export interface ResolvedKickoffDependencies {
  resolveBubble: typeof resolveBubbleById;
  readState: typeof readStateSnapshot;
  writeState: typeof writeStateSnapshot;
  readFileFn: typeof readFile;
  writeFileFn: typeof writeFile;
  appendEnvelope: typeof appendProtocolEnvelope;
}

export function resolveKickoffDependencies(
  overrides: KickoffDependencyOverrides
): ResolvedKickoffDependencies {
  return {
    resolveBubble: overrides.resolveBubbleById ?? resolveBubbleById,
    readState: overrides.readStateSnapshot ?? readStateSnapshot,
    writeState: overrides.writeStateSnapshot ?? writeStateSnapshot,
    readFileFn: overrides.readFile ?? readFile,
    writeFileFn: overrides.writeFile ?? writeFile,
    appendEnvelope: overrides.appendProtocolEnvelope ?? appendProtocolEnvelope
  };
}
