import type { ResolveAskHumanBubbleFromWorkspaceCwd } from "../askHuman/askHumanRoutingPreparationDependencyResolutionContract.js";

interface WorkspaceResolutionDefaultsModule {
  resolveBubbleFromWorkspaceCwd: ResolveAskHumanBubbleFromWorkspaceCwd;
}

let workspaceResolutionDefaultsModulePromise:
  | Promise<WorkspaceResolutionDefaultsModule>
  | undefined;

function getWorkspaceResolutionDefaultsModulePath(): string {
  return "../../defaults/workspace/workspaceResolutionDefaults.js";
}

async function loadWorkspaceResolutionDefaultsModule():
  Promise<WorkspaceResolutionDefaultsModule> {
  workspaceResolutionDefaultsModulePromise ??= import(
    getWorkspaceResolutionDefaultsModulePath()
  ) as Promise<WorkspaceResolutionDefaultsModule>;
  return workspaceResolutionDefaultsModulePromise;
}

export const resolveBubbleFromWorkspaceCwd:
  ResolveAskHumanBubbleFromWorkspaceCwd = async (...args) => {
    const { resolveBubbleFromWorkspaceCwd: resolveBubbleFromWorkspaceCwdDefault } =
      await loadWorkspaceResolutionDefaultsModule();
    return resolveBubbleFromWorkspaceCwdDefault(...args);
  };
