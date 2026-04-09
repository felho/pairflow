import { restartBubbleDependencyDefaults as restartBubbleDefaultsV11 } from "../../v11/infrastructure/executor/restart/restartCommandDefaults.js";

export type RestartBubbleDefaultDependencies = typeof restartBubbleDefaultsV11;

export const restartBubbleDependencyDefaults: RestartBubbleDefaultDependencies =
  restartBubbleDefaultsV11;
