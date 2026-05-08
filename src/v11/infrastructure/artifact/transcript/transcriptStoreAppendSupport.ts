import type { ProtocolMirrorWriteFailure } from "../../../ports/transcript.js";

export function toMirrorWriteFailure(
  mirrorPath: string,
  error: unknown
): ProtocolMirrorWriteFailure {
  if (error instanceof Error) {
    const typedError = error as NodeJS.ErrnoException;
    return {
      path: mirrorPath,
      message: error.message,
      ...(typedError.code !== undefined ? { code: typedError.code } : {})
    };
  }

  return {
    path: mirrorPath,
    message: String(error)
  };
}
