import type {
  EmitApprovalDecisionResult,
  EmitRequestReworkResult
} from "./approvalCommandContract.js";
import type {
  RunApprovalDecisionFlowInput,
  RunRequestReworkFlowInput
} from "./runApprovalFlowContract.js";
import type { ResolvedApprovalCommandDependencies } from "../../shared/approval/approvalCommandDependencyResolution.js";
import { initializeApprovalFlowExecutionContext } from "./runApprovalFlowContext.js";
import {
  runApprovalDecisionFlowWithContext,
  runRequestReworkFlowWithContext
} from "./runApprovalFlowHandlers.js";

export type {
  RunApprovalDecisionFlowInput,
  RunRequestReworkFlowInput
} from "./runApprovalFlowContract.js";

export async function runApprovalDecisionFlow(
  input: RunApprovalDecisionFlowInput,
  dependencies: ResolvedApprovalCommandDependencies
): Promise<EmitApprovalDecisionResult> {
  const execution = await initializeApprovalFlowExecutionContext(
    {
      bubbleId: input.bubbleId,
      now: input.now,
      dependencies,
      ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
      ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
    }
  );

  return runApprovalDecisionFlowWithContext({
    flow: input,
    dependencies,
    execution
  });
}

export async function runRequestReworkFlow(
  input: RunRequestReworkFlowInput,
  dependencies: ResolvedApprovalCommandDependencies
): Promise<EmitRequestReworkResult> {
  const execution = await initializeApprovalFlowExecutionContext(
    {
      bubbleId: input.bubbleId,
      now: input.now,
      dependencies,
      ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
      ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
    }
  );

  return runRequestReworkFlowWithContext({
    flow: input,
    dependencies,
    execution
  });
}
