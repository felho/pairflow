import { resolveBubbleById } from "../bubbleLookup/bubbleLookupDependencyDefaults.js";
import { readStateSnapshot } from "../state/stateStoreDependencyDefaults.js";
import type { ReadRuntimeSessionsRegistryPort } from "../../shared/ports/runtimeSessions.js";

interface RuntimeSessionsDefaultsModule {
  readRuntimeSessionsRegistry: ReadRuntimeSessionsRegistryPort;
}

let runtimeSessionsDefaultsModulePromise:
  | Promise<RuntimeSessionsDefaultsModule>
  | undefined;

function getRuntimeSessionsDefaultsModulePath(): string {
  return "../../defaults/runtimeSessions/runtimeSessionsDefaults.js";
}

async function loadRuntimeSessionsDefaultsModule():
  Promise<RuntimeSessionsDefaultsModule> {
  runtimeSessionsDefaultsModulePromise ??= import(
    getRuntimeSessionsDefaultsModulePath()
  ) as Promise<RuntimeSessionsDefaultsModule>;
  return runtimeSessionsDefaultsModulePromise;
}

const readRuntimeSessionsRegistry:
  ReadRuntimeSessionsRegistryPort = async (...args) => {
    const {
      readRuntimeSessionsRegistry: readRuntimeSessionsRegistryDefault
    } = await loadRuntimeSessionsDefaultsModule();
    return readRuntimeSessionsRegistryDefault(...args);
  };

export const metaReviewCommandSubmitDefaults = {
  readRuntimeSessionsRegistry,
  readStateSnapshot,
  resolveBubbleById
} as const;
