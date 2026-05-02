import { nodeProcessSpawn } from "../../infrastructure/executor/process/nodeProcessSpawn.js";
import type { ProcessSpawnPort } from "../../shared/ports/processSpawn.js";

export const processSpawnDefault: ProcessSpawnPort = (...args) =>
  nodeProcessSpawn(...args);
