import { resolveBubbleById } from "./bubbleLookup.js";
import { registerRepoInRegistry } from "../repo/registry.js";

export const startCliDependencyDefaults = {
  registerRepoInRegistry,
  resolveBubbleById
} as const;
