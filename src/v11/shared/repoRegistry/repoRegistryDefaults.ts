import {
  registerRepoInRegistry as registerRepoInRegistryDefaults
} from "../../defaults/repoRegistry/repoRegistryDefaults.js";
import type { RegisterRepoInRegistryPort } from "../ports/repoRegistry.js";

export const registerRepoInRegistry: RegisterRepoInRegistryPort =
  async (...args) => registerRepoInRegistryDefaults(...args);
