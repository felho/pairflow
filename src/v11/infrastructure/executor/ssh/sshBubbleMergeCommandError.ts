export interface RemoteBubbleMergeCommandErrorContext {
  command_name: "merge";
  bubble_id?: string;
  remote_alias?: string;
  remote_host?: string;
  remote_clone_path?: string;
  remote_reason_code?: string;
  operation?: "transport" | "payload" | "command" | "cleanup_transport";
}

export class RemoteBubbleMergeCommandError extends Error {
  public readonly code:
    | "REMOTE_MERGE_TRANSPORT_FAILED"
    | "REMOTE_MERGE_PAYLOAD_INVALID"
    | "REMOTE_MERGE_COMMAND_FAILED"
    | (string & {});
  public readonly context: RemoteBubbleMergeCommandErrorContext | undefined;

  public constructor(input: {
    code:
      | "REMOTE_MERGE_TRANSPORT_FAILED"
      | "REMOTE_MERGE_PAYLOAD_INVALID"
      | "REMOTE_MERGE_COMMAND_FAILED"
      | (string & {});
    message: string;
    cause?: unknown;
    context?: RemoteBubbleMergeCommandErrorContext;
  }) {
    super(input.message, input.cause === undefined ? undefined : { cause: input.cause });
    this.name = "RemoteBubbleMergeCommandError";
    this.code = input.code;
    this.context = input.context;
  }
}
