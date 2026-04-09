import { registerRepoInRegistry } from "./registry.js";
import type { RegisterRepoInRegistryPort } from "../../v11/shared/ports/repoRegistry.js";

export const createCliDependencyDefaults = {
  registerRepoInRegistry
} as const satisfies {
  registerRepoInRegistry: RegisterRepoInRegistryPort;
};
