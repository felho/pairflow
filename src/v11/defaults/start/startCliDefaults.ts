import { resolveBubbleById } from "../../infrastructure/executor/workspace/bubbleLookup.js";
import { registerRepoInRegistry } from "../../infrastructure/executor/workspace/repoRegistry.js";

export const startCliDependencyDefaults = {
  registerRepoInRegistry,
  resolveBubbleById
} as const;
