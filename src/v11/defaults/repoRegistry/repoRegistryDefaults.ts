import { registerRepoInRegistry as registerRepoInRegistryCanonical } from "../../infrastructure/executor/workspace/repoRegistry.js";
import type { RegisterRepoInRegistryPort } from "../../ports/repoRegistry.js";

export const registerRepoInRegistry: RegisterRepoInRegistryPort = async (
  ...args
) => registerRepoInRegistryCanonical(...args);
