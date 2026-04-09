import { isNamedError } from "../errors/namedError.js";

export function isKickoffStateWriteConflict(error: unknown): boolean {
  return isNamedError(error, "StateStoreConflictError");
}
