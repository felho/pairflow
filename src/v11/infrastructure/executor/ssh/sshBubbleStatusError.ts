import type { RemoteBubbleStatusErrorCode } from "../../../shared/status/remoteBubbleStatusContract.js";

export interface RemoteBubbleStatusErrorContext {
  command_name: "status";
  bubble_id?: string;
  remote_alias?: string;
  remote_host?: string;
  remote_clone_path?: string;
  remote_path?: string;
  operation?: "config" | "transport" | "payload";
  expected?: string;
}

export class RemoteBubbleStatusError extends Error {
  public readonly code: RemoteBubbleStatusErrorCode;
  public readonly context: RemoteBubbleStatusErrorContext | undefined;

  public constructor(input: {
    code: RemoteBubbleStatusErrorCode;
    message: string;
    context?: RemoteBubbleStatusErrorContext;
    cause?: unknown;
  }) {
    super(input.message, input.cause === undefined ? undefined : { cause: input.cause });
    this.name = "RemoteBubbleStatusError";
    this.code = input.code;
    this.context = input.context;
  }
}

export function toRemoteBubbleStatusError(input: {
  code: RemoteBubbleStatusErrorCode;
  message: string;
  context?: RemoteBubbleStatusErrorContext;
  cause?: unknown;
}): RemoteBubbleStatusError {
  return new RemoteBubbleStatusError(input);
}
