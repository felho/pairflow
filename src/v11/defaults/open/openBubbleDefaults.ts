import type { OpenBubbleDependencies } from "../../application/open/openBubble.js";
import { readRemotePointer } from "../../infrastructure/artifact/bubble/remoteExecutionArtifacts.js";
import { resolveBubbleById } from "../../infrastructure/executor/workspace/bubbleLookup.js";

export const openBubbleDefaults = {
  resolveBubbleById,
  readRemotePointer
} as const satisfies Pick<
  OpenBubbleDependencies,
  "resolveBubbleById" | "readRemotePointer"
>;
