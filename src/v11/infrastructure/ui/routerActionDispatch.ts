import type {
  AttachBubbleResult,
  UiBubbleActionDispatchDependencies
} from "../../shared/ports/uiRouter.js";
import {
  badRequest,
  parseApproveBody,
  parseCommitBody,
  parseDeleteBody,
  parseMergeBody,
  parseOptionalRefs,
  parseReviewPolicyBody,
  requireMessage,
  throwApiError
} from "./routerHttp.js";

interface BubbleActionDispatchInput {
  environment: BubbleActionDispatchEnvironment;
  action: string;
  bubbleId: string;
  repoPath: string;
  body: unknown;
}

interface BubbleActionDispatchEnvironment {
  requestContext: {
    cwd?: string | undefined;
  };
  dependencies: UiBubbleActionDispatchDependencies;
}

export interface BubbleActionResponse {
  status: number;
  result: unknown;
}

function resolveOptionalCwd(environment: BubbleActionDispatchEnvironment) {
  return environment.requestContext.cwd !== undefined
    ? { cwd: environment.requestContext.cwd }
    : {};
}

async function handleAttachAction(
  environment: BubbleActionDispatchEnvironment,
  repoPath: string,
  bubbleId: string
): Promise<AttachBubbleResult> {
  return environment.dependencies.attachBubble({
    bubbleId,
    repoPath,
    ...resolveOptionalCwd(environment)
  });
}

async function handleApproveAction(
  input: BubbleActionDispatchInput
): Promise<BubbleActionResponse> {
  const approveInput = parseApproveBody(input.body);
  return {
    status: 200,
    result: await input.environment.dependencies.emitApprove({
      bubbleId: input.bubbleId,
      ...(approveInput.refs.length > 0 ? { refs: approveInput.refs } : {}),
      overrideNonApprove: approveInput.overrideNonApprove,
      ...(approveInput.overrideReason !== undefined
        ? { overrideReason: approveInput.overrideReason }
        : {}),
      repoPath: input.repoPath,
      ...resolveOptionalCwd(input.environment)
    })
  };
}

function buildMessageActionInput(input: BubbleActionDispatchInput) {
  const message = requireMessage(input.body);
  const refs = parseOptionalRefs(input.body);
  return {
    bubbleId: input.bubbleId,
    message,
    ...(refs.length > 0 ? { refs } : {}),
    repoPath: input.repoPath,
    ...resolveOptionalCwd(input.environment)
  };
}

async function handleRequestReworkAction(
  input: BubbleActionDispatchInput
): Promise<BubbleActionResponse> {
  return {
    status: 200,
    result: await input.environment.dependencies.emitRequestRework(
      buildMessageActionInput(input)
    )
  };
}

async function handleReplyAction(
  input: BubbleActionDispatchInput
): Promise<BubbleActionResponse> {
  return {
    status: 200,
    result: await input.environment.dependencies.emitHumanReply(
      buildMessageActionInput(input)
    )
  };
}

async function handleCommitAction(
  input: BubbleActionDispatchInput
): Promise<BubbleActionResponse> {
  const commitInput = parseCommitBody(input.body);
  return {
    status: 200,
    result: await input.environment.dependencies.commitBubble({
      bubbleId: input.bubbleId,
      repoPath: input.repoPath,
      ...(commitInput.message !== undefined
        ? { message: commitInput.message }
        : {}),
      ...(commitInput.refs !== undefined ? { refs: commitInput.refs } : {}),
      stageAll: commitInput.stageAll,
      ...resolveOptionalCwd(input.environment)
    })
  };
}

async function handleMergeAction(
  input: BubbleActionDispatchInput
): Promise<BubbleActionResponse> {
  const mergeInput = parseMergeBody(input.body);
  return {
    status: 200,
    result: await input.environment.dependencies.mergeBubble({
      bubbleId: input.bubbleId,
      repoPath: input.repoPath,
      ...(mergeInput.push !== undefined ? { push: mergeInput.push } : {}),
      ...(mergeInput.deleteRemote !== undefined
        ? { deleteRemote: mergeInput.deleteRemote }
        : {}),
      ...resolveOptionalCwd(input.environment)
    })
  };
}

async function handleDeleteAction(
  input: BubbleActionDispatchInput
): Promise<BubbleActionResponse> {
  const deleteInput = parseDeleteBody(input.body);
  const result = await input.environment.dependencies.deleteBubble({
    bubbleId: input.bubbleId,
    repoPath: input.repoPath,
    ...(deleteInput.force !== undefined ? { force: deleteInput.force } : {}),
    ...resolveOptionalCwd(input.environment)
  });
  return {
    status: result.requiresConfirmation && !result.deleted ? 202 : 200,
    result
  };
}

async function handleUpdateReviewPolicyAction(
  input: BubbleActionDispatchInput
): Promise<BubbleActionResponse> {
  const reviewPolicyInput = parseReviewPolicyBody(input.body);
  return {
    status: 200,
    // Keep lifecycle-state authority inside the lock-aware mutation seam so the
    // router does not introduce a second, stale preflight decision point.
    result: await input.environment.dependencies.updateBubbleReviewPolicy({
      bubbleId: input.bubbleId,
      repoPath: input.repoPath,
      reviewLoopMode: reviewPolicyInput.reviewLoopMode,
      ...(reviewPolicyInput.reviewBlockingMinSeverity !== undefined
        ? {
            reviewBlockingMinSeverity:
              reviewPolicyInput.reviewBlockingMinSeverity
          }
        : {}),
      ...(reviewPolicyInput.metaReviewQualityPreset !== undefined
        ? { metaReviewQualityPreset: reviewPolicyInput.metaReviewQualityPreset }
        : {}),
      ...(reviewPolicyInput.expectedBubbleToml !== undefined
        ? { expectedBubbleToml: reviewPolicyInput.expectedBubbleToml }
        : {}),
      ...resolveOptionalCwd(input.environment)
    })
  };
}

export async function dispatchBubbleAction(
  input: BubbleActionDispatchInput
): Promise<BubbleActionResponse> {
  switch (input.action) {
    case "start":
      return {
        status: 200,
        result: await input.environment.dependencies.startBubble({
          bubbleId: input.bubbleId,
          repoPath: input.repoPath,
          ...resolveOptionalCwd(input.environment)
        })
      };
    case "approve":
      return handleApproveAction(input);
    case "request-rework":
      return handleRequestReworkAction(input);
    case "reply":
      return handleReplyAction(input);
    case "resume":
      return {
        status: 200,
        result: await input.environment.dependencies.resumeBubble({
          bubbleId: input.bubbleId,
          repoPath: input.repoPath,
          ...resolveOptionalCwd(input.environment)
        })
      };
    case "commit":
      return handleCommitAction(input);
    case "merge":
      return handleMergeAction(input);
    case "open":
      return {
        status: 200,
        result: await input.environment.dependencies.openBubble({
          bubbleId: input.bubbleId,
          repoPath: input.repoPath,
          ...resolveOptionalCwd(input.environment)
        })
      };
    case "attach":
      return {
        status: 200,
        result: await handleAttachAction(
          input.environment,
          input.repoPath,
          input.bubbleId
        )
      };
    case "update-review-policy":
      return handleUpdateReviewPolicyAction(input);
    case "stop":
      return {
        status: 200,
        result: await input.environment.dependencies.stopBubble({
          bubbleId: input.bubbleId,
          repoPath: input.repoPath,
          ...resolveOptionalCwd(input.environment)
        })
      };
    case "restart":
      return {
        status: 200,
        result: await input.environment.dependencies.restartBubble({
          bubbleId: input.bubbleId,
          repoPath: input.repoPath,
          ...resolveOptionalCwd(input.environment)
        })
      };
    case "delete":
      return handleDeleteAction(input);
    default:
      throwApiError(
        badRequest(
          `UI_ROUTER_ACTION_UNSUPPORTED: Unsupported bubble action: ${input.action}.`,
          { action: input.action }
        )
      );
  }
}
