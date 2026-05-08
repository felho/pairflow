import type { BubbleStateSnapshot } from "../../shared/state/bubbleStateSnapshotTypes.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";

export interface ApprovalRemoteBubbleStatusTarget {
  alias: string;
  host: string;
  user?: string;
  pairflowCommand: string;
}

interface ApprovalRemoteBubbleCommandBaseInput {
  bubbleId: string;
  remoteClonePath: string;
  remoteTarget: ApprovalRemoteBubbleStatusTarget;
  refs: string[];
}

export interface ExecuteRemoteBubbleApproveCommandInput
  extends ApprovalRemoteBubbleCommandBaseInput {
  action: "approve";
  overrideNonApprove: boolean;
  overrideReason?: string;
}

export interface ExecuteRemoteBubbleRequestReworkCommandInput
  extends ApprovalRemoteBubbleCommandBaseInput {
  action: "request-rework";
  message: string;
}

export type ExecuteRemoteBubbleApprovalCommandInput =
  | ExecuteRemoteBubbleApproveCommandInput
  | ExecuteRemoteBubbleRequestReworkCommandInput;

export interface RemoteBubbleApprovalDecisionResult {
  kind: "decision";
  bubbleId: string;
  sequence: number;
  envelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
}

export interface RemoteBubbleApprovalQueuedReworkResult {
  kind: "queued_rework";
  bubbleId: string;
  intentId: string;
  state: BubbleStateSnapshot;
  supersededIntentId?: string;
}

export type ExecuteRemoteBubbleApprovalCommandResult =
  | RemoteBubbleApprovalDecisionResult
  | RemoteBubbleApprovalQueuedReworkResult;

export type ExecuteRemoteBubbleApprovalCommandPort = (
  input: ExecuteRemoteBubbleApprovalCommandInput
) => Promise<ExecuteRemoteBubbleApprovalCommandResult>;

export type ResolveApprovalRemoteBubbleStatusTargetPort = (input: {
  bubbleId: string;
  remoteAlias: string;
  expectedHost?: string;
}) => Promise<ApprovalRemoteBubbleStatusTarget>;

let executeRemoteBubbleApprovalCommandPromise:
  | Promise<ExecuteRemoteBubbleApprovalCommandPort>
  | undefined;

export async function loadExecuteRemoteBubbleApprovalCommandDefault(): Promise<ExecuteRemoteBubbleApprovalCommandPort> {
  executeRemoteBubbleApprovalCommandPromise ??= (async () => {
    const moduleName = "sshBubbleApprovalCommand";
    const modulePath =
      `../../infrastructure/executor/ssh/${moduleName}.js`;
    const remoteModule = (await import(modulePath)) as unknown as {
      executeRemoteBubbleApprovalCommand?: unknown;
    };
    const executeRemoteBubbleApprovalCommand =
      remoteModule.executeRemoteBubbleApprovalCommand;
    if (typeof executeRemoteBubbleApprovalCommand !== "function") {
      throw new TypeError(
        "REMOTE_APPROVAL_DEFAULT_EXPORT_INVALID: executeRemoteBubbleApprovalCommand default loader returned a non-function export. context: command_name=approval."
      );
    }
    return remoteModule.executeRemoteBubbleApprovalCommand as ExecuteRemoteBubbleApprovalCommandPort;
  })();

  return executeRemoteBubbleApprovalCommandPromise;
}
