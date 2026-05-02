import {
  type KickoffWrittenState,
  type writeKickoffState
} from "./kickoffStateWrite.js";

export type KickoffStateWriteMappedResult =
  | {
      kind: "success";
      writtenState: KickoffWrittenState;
    }
  | {
      kind: "conflict";
    };

export function buildKickoffStateConflictResult(): KickoffStateWriteMappedResult {
  return {
    kind: "conflict"
  };
}

function buildKickoffStateSuccessResult(input: {
  writtenState: KickoffWrittenState;
}): KickoffStateWriteMappedResult {
  return {
    kind: "success",
    writtenState: input.writtenState
  };
}

export function mapKickoffStateWriteResult(
  result: Awaited<ReturnType<typeof writeKickoffState>>
): KickoffStateWriteMappedResult {
  if (result.kind === "conflict") {
    return buildKickoffStateConflictResult();
  }

  return buildKickoffStateSuccessResult({
    writtenState: result.writtenState
  });
}
