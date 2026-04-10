import { resolveBubbleFromWorkspaceCwd as resolveBubbleFromWorkspaceCwdCanonical } from "../../infrastructure/executor/workspace/workspaceResolution.js";
import type { ResolveAskHumanBubbleFromWorkspaceCwd } from "../../shared/askHuman/askHumanRoutingPreparationDependencyResolutionContract.js";

export const resolveBubbleFromWorkspaceCwd: ResolveAskHumanBubbleFromWorkspaceCwd =
  async (...args) => resolveBubbleFromWorkspaceCwdCanonical(...args);
