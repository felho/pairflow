import { resolveBubbleById } from "../bubbleLookup/bubbleLookupDefaults.js";
import { registerRepoInRegistry } from "../repoRegistry/repoRegistryDefaults.js";

export const startCliDependencyDefaults = {
  registerRepoInRegistry,
  resolveBubbleById
} as const;
