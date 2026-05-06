import type { ProcessSpawnPort } from "../../shared/ports/processSpawn.js";

function getProcessSpawnDefaultsModulePath(): string {
  return "../../defaults/process/processSpawnDefaults.js";
}

const { processSpawnDefault: loadedProcessSpawnDefault } = await import(
  getProcessSpawnDefaultsModulePath()
) as {
  processSpawnDefault: ProcessSpawnPort;
};

export const processSpawnDefault: ProcessSpawnPort = (...args) =>
  loadedProcessSpawnDefault(...args);
