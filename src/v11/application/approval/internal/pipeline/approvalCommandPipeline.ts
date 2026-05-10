import type {
  EmitApprovalDecisionResult,
  EmitRequestReworkResult
} from "../../approvalCommandContract.js";
import {
  runApprovalDecisionFlow,
  runRequestReworkFlow
} from "../flow/runApprovalFlow.js";
import type {
  ApprovalCommandPipelineDependencies,
  ApprovalCommandPipelineInput,
  ApprovalCommandPipelineResult
} from "./approvalCommandPipelineContract.js";

export type {
  ApprovalCommandPipelineDependencies,
  ApprovalCommandPipelineInput,
  ApprovalCommandPipelineResult
} from "./approvalCommandPipelineContract.js";

export async function runApprovalCommandPipeline(
  input: ApprovalCommandPipelineInput,
  dependencies: ApprovalCommandPipelineDependencies
): Promise<ApprovalCommandPipelineResult> {
  if (input.intent === "approval_decision") {
    return runApprovalDecisionPipeline(input, dependencies);
  }

  return runRequestReworkPipeline(input, dependencies);
}

async function runApprovalDecisionPipeline(
  input: Extract<ApprovalCommandPipelineInput, { intent: "approval_decision" }>,
  dependencies: ApprovalCommandPipelineDependencies
): Promise<EmitApprovalDecisionResult> {
  return runApprovalDecisionFlow(
    {
      bubbleId: input.bubbleId,
      decision: input.decision,
      overrideNonApprove: input.overrideNonApprove,
      overrideReason: input.overrideReason,
      message: input.message,
      refs: input.refs,
      repoPath: input.repoPath,
      cwd: input.cwd,
      now: input.now,
      createError: input.createError
    },
    dependencies
  );
}

async function runRequestReworkPipeline(
  input: Extract<ApprovalCommandPipelineInput, { intent: "request_rework" }>,
  dependencies: ApprovalCommandPipelineDependencies
): Promise<EmitRequestReworkResult> {
  return runRequestReworkFlow(
    {
      bubbleId: input.bubbleId,
      message: input.message,
      refs: input.refs,
      repoPath: input.repoPath,
      cwd: input.cwd,
      now: input.now,
      createError: input.createError
    },
    dependencies
  );
}
