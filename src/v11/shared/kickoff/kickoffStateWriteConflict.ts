import { StateStoreConflictError } from "../../infrastructure/state/stateStore.js";

export function isKickoffStateWriteConflict(error: unknown): boolean {
  return error instanceof StateStoreConflictError;
}
