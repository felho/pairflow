import { processSpawnDefault } from "../../defaults/process/processSpawnDefaults.js";
import type { ProcessSpawnPort } from "../ports/processSpawn.js";

export const processSpawn: ProcessSpawnPort = (...args) =>
  processSpawnDefault(...args);
