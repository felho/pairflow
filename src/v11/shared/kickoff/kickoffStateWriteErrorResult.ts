import { isKickoffStateWriteConflict } from "./kickoffStateWriteConflict.js";

export type KickoffStateWriteConflictResult = {
  kind: "conflict";
};

function buildKickoffWriteConflictResult(): KickoffStateWriteConflictResult {
  return {
    kind: "conflict"
  };
}

export function resolveKickoffWriteErrorResult(
  error: unknown
): KickoffStateWriteConflictResult | null {
  if (isKickoffStateWriteConflict(error)) {
    return buildKickoffWriteConflictResult();
  }
  return null;
}
