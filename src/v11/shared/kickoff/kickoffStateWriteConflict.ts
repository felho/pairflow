import { StateStoreConflictError } from "../../../core/state/stateStore.js";

export function isKickoffStateWriteConflict(error: unknown): boolean {
  return error instanceof StateStoreConflictError;
}
