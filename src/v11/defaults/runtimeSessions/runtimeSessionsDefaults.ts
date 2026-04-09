import {
  removeRuntimeSession as removeRuntimeSessionCanonical,
  readRuntimeSessionsRegistry as readRuntimeSessionsRegistryCanonical,
  removeRuntimeSessions as removeRuntimeSessionsCanonical
} from "../../infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import type {
  ReadRuntimeSessionsRegistryPort,
  RemoveRuntimeSessionPort,
  RemoveRuntimeSessionsPort
} from "../../shared/ports/runtimeSessions.js";

export const readRuntimeSessionsRegistry: ReadRuntimeSessionsRegistryPort = async (
  ...args
) => readRuntimeSessionsRegistryCanonical(...args);

export const removeRuntimeSessions: RemoveRuntimeSessionsPort = async (...args) =>
  removeRuntimeSessionsCanonical(...args);

export const removeRuntimeSession: RemoveRuntimeSessionPort = async (...args) =>
  removeRuntimeSessionCanonical(...args);
