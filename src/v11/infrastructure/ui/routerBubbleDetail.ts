import { join } from "node:path";

import type {
  UiBubbleDetail,
  UiBubbleStatusView
} from "../../../contracts/ui/uiReadModel.js";
import type { RuntimeSessionRecord } from "../executor/sessionRuntime/runtimeSessionsRegistry.js";
import { presentBubbleDetail } from "./presenters/bubblePresenter.js";
import type { UiBubbleDetailDependencies } from "../../shared/ports/uiRouter.js";

export interface RouterBubbleDetailEnvironment {
  requestContext: {
    cwd?: string | undefined;
  };
  dependencies: UiBubbleDetailDependencies;
}

async function loadRuntimeSession(
  dependencies: UiBubbleDetailDependencies,
  repoPath: string,
  bubbleId: string
): Promise<RuntimeSessionRecord | null> {
  const sessionsPath = join(repoPath, ".pairflow", "runtime", "sessions.json");
  const sessions = await dependencies.readRuntimeSessionsRegistry(sessionsPath, {
    allowMissing: true
  });
  return sessions[bubbleId] ?? null;
}

function withDetailRepoPath(
  status: UiBubbleStatusView,
  repoPath: string
): UiBubbleStatusView {
  return {
    ...status,
    repoPath
  };
}

export async function loadBubbleDetail(input: {
  environment: RouterBubbleDetailEnvironment;
  repoPath: string;
  bubbleId: string;
}): Promise<UiBubbleDetail> {
  const { environment, repoPath, bubbleId } = input;
  const [status, inbox, runtimeSession] = await Promise.all([
    environment.dependencies.getBubbleStatus({
      bubbleId,
      repoPath,
      ...(environment.requestContext.cwd !== undefined
        ? { cwd: environment.requestContext.cwd }
        : {})
    }),
    environment.dependencies.getBubbleInbox({
      bubbleId,
      repoPath,
      ...(environment.requestContext.cwd !== undefined
        ? { cwd: environment.requestContext.cwd }
        : {})
    }),
    loadRuntimeSession(environment.dependencies, repoPath, bubbleId)
  ]);
  const now = new Date();
  return {
    ...presentBubbleDetail({
      status: withDetailRepoPath(status, repoPath),
      inbox,
      runtimeSession,
      now
    })
  };
}
