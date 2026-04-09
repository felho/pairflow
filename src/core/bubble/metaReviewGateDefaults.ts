import { appendProtocolEnvelope } from "../protocol/transcriptStore.js";
import { resolveBubbleById } from "./bubbleLookup.js";
import { setMetaReviewerPaneBinding } from "../runtime/sessionsRegistry.js";
import { readFile, writeFile } from "node:fs/promises";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../state/stateStore.js";
import { runTmux } from "../runtime/tmuxManager.js";

export const metaReviewGateDependencyDefaults = {
  appendProtocolEnvelope,
  readFile,
  readStateSnapshot,
  resolveBubbleById,
  runTmux,
  setMetaReviewerPaneBinding,
  writeFile,
  writeStateSnapshot
} as const;
