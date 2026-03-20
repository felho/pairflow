import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { ResolvedApprovalCommandDependencies } from "../../shared/approval/approvalCommandDependencyResolution.js";
import type { RunApprovalDecisionFlowInput, RunRequestReworkFlowInput } from "./runApprovalFlowContract.js";

export interface ApprovalFlowExecutionContext {
  resolved: Awaited<ReturnType<ResolvedApprovalCommandDependencies["resolveBubbleById"]>>;
  loadedState: Awaited<ReturnType<ResolvedApprovalCommandDependencies["readStateSnapshot"]>>;
  state: BubbleStateSnapshot;
  nowIso: string;
  lockPath: string;
}

export async function initializeApprovalFlowExecutionContext(input: {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now: Date;
  dependencies: ResolvedApprovalCommandDependencies;
}): Promise<ApprovalFlowExecutionContext> {
  const resolved = await input.dependencies.resolveBubbleById({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  const loadedState = await input.dependencies.readStateSnapshot(
    resolved.bubblePaths.statePath
  );

  return {
    resolved,
    loadedState,
    state: loadedState.state,
    nowIso: input.now.toISOString(),
    lockPath: `${resolved.bubblePaths.locksDir}/${resolved.bubbleId}.lock`
  };
}

export function toApprovalDecisionContext(input: {
  flow: RunApprovalDecisionFlowInput;
  dependencies: ResolvedApprovalCommandDependencies;
  execution: ApprovalFlowExecutionContext;
}) {
  return {
    input: input.flow,
    dependencies: input.dependencies,
    resolved: input.execution.resolved,
    loadedState: input.execution.loadedState,
    state: input.execution.state,
    nowIso: input.execution.nowIso,
    lockPath: input.execution.lockPath
  };
}

export function toRequestReworkContext(input: {
  flow: RunRequestReworkFlowInput;
  dependencies: ResolvedApprovalCommandDependencies;
}) {
  return {
    input: input.flow,
    dependencies: input.dependencies
  };
}
