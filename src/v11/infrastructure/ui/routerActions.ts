import type { IncomingMessage } from "node:http";
import { join } from "node:path";

import type { UiBubbleDetail } from "../../../types/ui.js";
import type { RuntimeSessionRecord } from "../executor/sessionRuntime/runtimeSessionsRegistry.js";
import { presentBubbleDetail, presentBubbleList } from "./presenters/bubblePresenter.js";
import { UiRepoScopeError, resolveScopedRepoPath } from "./repoScope.js";
import { dispatchBubbleAction } from "./routerActionDispatch.js";
import type { CreateUiRouterInput, UiApiError, UiRouterDependencies } from "./routerContracts.js";
import {
  asErrorMessage,
  badRequest,
  conflict,
  internalError,
  isAttachBubbleErrorLike,
  isBubbleCommitErrorLike,
  isBubbleMergeErrorLike,
  isConflictErrorMessage,
  isNotFoundErrorMessage,
  isRemoteBubbleCommitCommandErrorLike,
  isRemoteBubbleApprovalCommandErrorLike,
  isRemoteBubbleStatusErrorLike,
  notFound,
  parseStateFromErrorMessage,
  readJsonBody,
  throwApiError
} from "./routerHttp.js";

interface RouterActionEnvironment {
  input: CreateUiRouterInput;
  dependencies: UiRouterDependencies;
  routerCwd: string;
}

async function resolveRepoFromUrl(
  environment: RouterActionEnvironment,
  url: URL,
  options: { requireExplicitWhenMultiRepo?: boolean | undefined } = {}
): Promise<string> {
  try {
    const repoParam = url.searchParams.get("repo") ?? undefined;
    return await resolveScopedRepoPath({
      scope: environment.input.repoScope,
      repoParam,
      requireExplicitWhenMultiRepo: options.requireExplicitWhenMultiRepo,
      cwd: environment.routerCwd
    });
  } catch (error) {
    if (error instanceof UiRepoScopeError) {
      const message = error.message;
      if (message.includes("required when UI scope contains multiple")) {
        throwApiError(badRequest(message));
      }
      if (message.includes("out of UI scope")) {
        throwApiError(notFound(message));
      }
      throwApiError(badRequest(message));
    }
    throw error;
  }
}

function parseRefreshQueryFlag(url: URL): boolean | undefined {
  const value = url.searchParams.get("refresh");
  if (value === null) {
    return undefined;
  }
  if (value === "1" || value === "true") {
    return true;
  }
  if (value === "0" || value === "false") {
    return false;
  }
  return undefined;
}

async function loadRuntimeSession(
  dependencies: UiRouterDependencies,
  repoPath: string,
  bubbleId: string
): Promise<RuntimeSessionRecord | null> {
  const sessionsPath = join(repoPath, ".pairflow", "runtime", "sessions.json");
  const sessions = await dependencies.readRuntimeSessionsRegistry(sessionsPath, {
    allowMissing: true
  });
  return sessions[bubbleId] ?? null;
}

async function loadBubbleDetail(input: {
  environment: RouterActionEnvironment;
  repoPath: string;
  bubbleId: string;
}): Promise<UiBubbleDetail> {
  const { environment, repoPath, bubbleId } = input;
  const [status, inbox, runtimeSession] = await Promise.all([
    environment.dependencies.getBubbleStatus({
      bubbleId,
      repoPath,
      ...(environment.input.cwd !== undefined ? { cwd: environment.input.cwd } : {})
    }),
    environment.dependencies.getBubbleInbox({
      bubbleId,
      repoPath,
      ...(environment.input.cwd !== undefined ? { cwd: environment.input.cwd } : {})
    }),
    loadRuntimeSession(environment.dependencies, repoPath, bubbleId)
  ]);
  const now = new Date();
  return {
    ...presentBubbleDetail({
      status,
      inbox,
      runtimeSession,
      now
    }),
    repoPath
  };
}

async function mapConflictWithCurrentState(input: {
  environment: RouterActionEnvironment;
  message: string;
  repoPath: string;
  bubbleId: string;
  reasonCode?: string;
}): Promise<UiApiError> {
  let currentBubble: UiBubbleDetail | null = null;
  try {
    currentBubble = await loadBubbleDetail({
      environment: input.environment,
      repoPath: input.repoPath,
      bubbleId: input.bubbleId
    });
  } catch {
    currentBubble = null;
  }

  return conflict(input.message, {
    bubbleId: input.bubbleId,
    repoPath: input.repoPath,
    ...(input.reasonCode !== undefined ? { reasonCode: input.reasonCode } : {}),
    currentState:
      currentBubble?.state ?? parseStateFromErrorMessage(input.message) ?? null,
    ...(currentBubble !== null ? { bubble: currentBubble } : {})
  });
}

function buildBubbleActionErrorDetails(input: {
  bubbleId: string;
  repoPath: string;
  reasonCode: string;
}): { bubbleId: string; repoPath: string; reasonCode: string } {
  return {
    bubbleId: input.bubbleId,
    repoPath: input.repoPath,
    reasonCode: input.reasonCode
  };
}

async function mapBubbleCommitApiError(input: {
  environment: RouterActionEnvironment;
  message: string;
  repoPath: string;
  bubbleId: string;
  reasonCode: string;
}): Promise<UiApiError> {
  const details = buildBubbleActionErrorDetails(input);
  if (input.reasonCode === "REMOTE_STATUS_CONFIG_INVALID") {
    return badRequest(input.message, details);
  }
  if (
    input.reasonCode === "REMOTE_STATUS_TRANSPORT_FAILED" ||
    input.reasonCode === "COMMIT_REMOTE_START_REQUIRED"
  ) {
    return mapConflictWithCurrentState(input);
  }
  return internalError(input.message, details);
}

async function mapBubbleMergeApiError(input: {
  environment: RouterActionEnvironment;
  message: string;
  repoPath: string;
  bubbleId: string;
  reasonCode: string;
}): Promise<UiApiError> {
  const details = buildBubbleActionErrorDetails(input);
  if (input.reasonCode === "REMOTE_STATUS_CONFIG_INVALID") {
    return badRequest(input.message, details);
  }
  if (
    input.reasonCode === "REMOTE_STATUS_TRANSPORT_FAILED" ||
    input.reasonCode === "MERGE_REMOTE_START_REQUIRED" ||
    input.reasonCode === "MERGE_STATE_DONE_REQUIRED" ||
    input.reasonCode === "MERGE_REPO_DIRTY" ||
    input.reasonCode === "MERGE_BASE_BRANCH_NOT_FOUND" ||
    input.reasonCode === "MERGE_BUBBLE_BRANCH_NOT_FOUND" ||
    input.reasonCode === "MERGE_BRANCHES_IDENTICAL" ||
    input.reasonCode === "MERGE_CONFLICT_REQUIRES_MANUAL_RESOLUTION"
  ) {
    return mapConflictWithCurrentState(input);
  }
  return internalError(input.message, details);
}

function mapRemoteStatusApiError(input: {
  message: string;
  repoPath: string;
  bubbleId: string;
  reasonCode: string;
}): UiApiError {
  const details = buildBubbleActionErrorDetails(input);
  if (input.reasonCode === "REMOTE_STATUS_CONFIG_INVALID") {
    return badRequest(input.message, details);
  }
  if (input.reasonCode === "REMOTE_STATUS_TRANSPORT_FAILED") {
    return conflict(input.message, details);
  }
  return internalError(input.message, details);
}

function mapAttachApiError(input: {
  message: string;
  repoPath: string;
  bubbleId: string;
  error: unknown;
}): UiApiError | undefined {
  if (
    isAttachBubbleErrorLike(input.error) &&
    input.error.launcher !== undefined &&
    input.error.failureClass !== undefined
  ) {
    const details = {
      bubbleId: input.bubbleId,
      repoPath: input.repoPath,
      launcher: input.error.launcher,
      failureClass: input.error.failureClass,
      ...(input.error.stdoutExcerpt !== undefined
        ? { stdoutExcerpt: input.error.stdoutExcerpt }
        : {}),
      ...(input.error.stderrExcerpt !== undefined
        ? { stderrExcerpt: input.error.stderrExcerpt }
        : {})
    };
    return input.error.failureClass === "launcher_unavailable"
      ? badRequest(input.message, details)
      : internalError(input.message, details);
  }

  if (isAttachBubbleErrorLike(input.error) && input.error.reasonCode !== undefined) {
    return badRequest(input.message, {
      bubbleId: input.bubbleId,
      repoPath: input.repoPath,
      reasonCode: input.error.reasonCode,
      ...(input.error.context?.reason !== undefined
        ? { attachContextReason: input.error.context.reason }
        : {})
    });
  }

  return undefined;
}

async function mapActionErrorToApiError(input: {
  environment: RouterActionEnvironment;
  error: unknown;
  repoPath: string;
  bubbleId: string;
}): Promise<UiApiError> {
  const message = asErrorMessage(input.error);

  if (isNotFoundErrorMessage(message)) {
    return notFound(message, {
      bubbleId: input.bubbleId,
      repoPath: input.repoPath
    });
  }

  const bubbleCommitReasonCode =
    isBubbleCommitErrorLike(input.error)
      && typeof input.error.reasonCode === "string"
      ? input.error.reasonCode
      : undefined;

  if (bubbleCommitReasonCode !== undefined) {
    return mapBubbleCommitApiError({
      environment: input.environment,
      message,
      repoPath: input.repoPath,
      bubbleId: input.bubbleId,
      reasonCode: bubbleCommitReasonCode
    });
  }

  const bubbleMergeReasonCode =
    isBubbleMergeErrorLike(input.error)
      && typeof input.error.reasonCode === "string"
      ? input.error.reasonCode
      : undefined;

  if (bubbleMergeReasonCode !== undefined) {
    return mapBubbleMergeApiError({
      environment: input.environment,
      message,
      repoPath: input.repoPath,
      bubbleId: input.bubbleId,
      reasonCode: bubbleMergeReasonCode
    });
  }

  const remoteCommitCommandError =
    isRemoteBubbleCommitCommandErrorLike(input.error)
      && typeof input.error.code === "string"
      ? input.error
      : null;

  if (remoteCommitCommandError !== null) {
    return internalError(message, {
      bubbleId: input.bubbleId,
      repoPath: input.repoPath,
      reasonCode: remoteCommitCommandError.code
    });
  }

  if (isConflictErrorMessage(message)) {
    return mapConflictWithCurrentState({
      environment: input.environment,
      message,
      repoPath: input.repoPath,
      bubbleId: input.bubbleId,
      ...(bubbleCommitReasonCode !== undefined
        ? { reasonCode: bubbleCommitReasonCode }
        : {})
    });
  }

  const attachApiError = mapAttachApiError({
    message,
    repoPath: input.repoPath,
    bubbleId: input.bubbleId,
    error: input.error
  });
  if (attachApiError !== undefined) {
    return attachApiError;
  }

  if (isRemoteBubbleApprovalCommandErrorLike(input.error)) {
    const details = {
      bubbleId: input.bubbleId,
      repoPath: input.repoPath,
      reasonCode: input.error.code
    };
    return internalError(message, details);
  }

  if (isRemoteBubbleStatusErrorLike(input.error)) {
    const { code } = input.error;
    if (typeof code !== "string") {
      return internalError(message, {
        bubbleId: input.bubbleId,
        repoPath: input.repoPath
      });
    }
    return mapRemoteStatusApiError({
      message,
      repoPath: input.repoPath,
      bubbleId: input.bubbleId,
      reasonCode: code
    });
  }

  if (input.error instanceof Error && input.error.name === "UiApiBadRequest") {
    return badRequest(message);
  }

  return internalError(message);
}

export async function handleBubbleActionRequest(input: {
  environment: RouterActionEnvironment;
  req: IncomingMessage;
  url: URL;
  bubbleId: string;
}): Promise<{ status: number; result: unknown }> {
  const repoPath = await resolveRepoFromUrl(input.environment, input.url);
  const body = await readJsonBody(input.req);
  const action = input.url.pathname.split("/").filter(Boolean)[3] ?? "";
  try {
    return await dispatchBubbleAction({
      environment: input.environment,
      action,
      bubbleId: input.bubbleId,
      repoPath,
      body
    });
  } catch (error) {
    if (error instanceof Error && error.name === "UiApiHttpError") {
      throw error;
    }
    throwApiError(
      await mapActionErrorToApiError({
        environment: input.environment,
        error,
        repoPath,
        bubbleId: input.bubbleId
      })
    );
  }
}

export async function handleBubbleResourceRequest(input: {
  environment: RouterActionEnvironment;
  url: URL;
  bubbleId: string;
  pathname: string;
}): Promise<{ status: number; body: unknown }> {
  const repoPath = await resolveRepoFromUrl(input.environment, input.url);
  if (input.pathname.endsWith("/timeline")) {
    const timeline = await input.environment.dependencies.readBubbleTimeline({
      bubbleId: input.bubbleId,
      repoPath,
      ...(input.environment.input.cwd !== undefined
        ? { cwd: input.environment.input.cwd }
        : {})
    });
    return {
      status: 200,
      body: {
        bubbleId: input.bubbleId,
        repoPath,
        timeline
      }
    };
  }
  return {
    status: 200,
    body: {
      bubble: await loadBubbleDetail({
        environment: input.environment,
        repoPath,
        bubbleId: input.bubbleId
      })
    }
  };
}

export async function handleBubbleListRequest(input: {
  environment: RouterActionEnvironment;
  url: URL;
}): Promise<{ status: number; body: unknown }> {
  const repoPath = await resolveRepoFromUrl(input.environment, input.url);
  const refresh = parseRefreshQueryFlag(input.url);
  const view = await input.environment.dependencies.listBubbles({
    repoPath,
    ...(refresh !== undefined ? { refresh } : {}),
    ...(input.environment.input.cwd !== undefined
      ? { cwd: input.environment.input.cwd }
      : {})
  });
  const presented = presentBubbleList(view);
  return {
    status: 200,
    body: {
      repo: presented.repo,
      bubbles: presented.bubbles
    }
  };
}
