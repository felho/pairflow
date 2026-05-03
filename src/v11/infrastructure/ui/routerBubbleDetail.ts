import { join } from "node:path";

import type { UiBubbleDetail } from "../../../contracts/ui/uiReadModel.js";
import type { RuntimeSessionRecord } from "../executor/sessionRuntime/runtimeSessionsRegistry.js";
import type { BubbleStatusView } from "../../shared/status/statusCommandApi.js";
import { presentBubbleDetail } from "./presenters/bubblePresenter.js";
import type { UiRouterDependencies } from "./routerContracts.js";

export interface RouterBubbleDetailEnvironment {
  input: {
    cwd?: string | undefined;
  };
  dependencies: UiRouterDependencies;
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

function withDetailRepoPath(status: BubbleStatusView, repoPath: string): BubbleStatusView {
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
      status: withDetailRepoPath(status, repoPath),
      inbox,
      runtimeSession,
      now
    })
  };
}
