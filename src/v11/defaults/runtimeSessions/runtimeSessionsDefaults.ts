import {
  readRuntimeSessionsRegistry as readRuntimeSessionsRegistryCanonical,
  removeRuntimeSessions as removeRuntimeSessionsCanonical
} from "../../infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import type {
  ReadRuntimeSessionsRegistryPort,
  RemoveRuntimeSessionsPort
} from "../../shared/ports/runtimeSessions.js";

export const readRuntimeSessionsRegistry: ReadRuntimeSessionsRegistryPort = async (
  ...args
) => readRuntimeSessionsRegistryCanonical(...args);

export const removeRuntimeSessions: RemoveRuntimeSessionsPort = async (...args) =>
  removeRuntimeSessionsCanonical(...args);
