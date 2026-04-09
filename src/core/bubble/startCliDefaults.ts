import { resolveBubbleById } from "./bubbleLookup.js";
import { registerRepoInRegistry } from "../../v11/infrastructure/executor/workspace/repoRegistry.js";

export const startCliDependencyDefaults = {
  registerRepoInRegistry,
  resolveBubbleById
} as const;
