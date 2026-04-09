import type { ResolvedBubbleStatusContext } from "./statusCommandTypes.js";

const statusCommandPathViewDefaultsPromise = import(
  "../../../core/runtime/pairflowCommand.js"
).then(({ assessPairflowCommandPath }) => ({
  assessPairflowCommandPath
}));

const statusCommandPathViewDefaults = await statusCommandPathViewDefaultsPromise;

export function toStatusCommandPathView(
  resolved: ResolvedBubbleStatusContext
): {
  status: "worktree_local" | "external" | "stale" | "missing" | "unknown";
  reasonCode?:
    | "PAIRFLOW_COMMAND_PATH_STALE"
    | "PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE"
    | "PAIRFLOW_COMMAND_PATH_UNRESOLVED";
  profile: "external" | "self_host";
  localEntrypoint: string;
  activeEntrypoint: string | null;
  message: string;
  pinnedCommand: string;
} {
  const commandPath = statusCommandPathViewDefaults.assessPairflowCommandPath({
    worktreePath: resolved.bubblePaths.worktreePath,
    profile: resolved.bubbleConfig.pairflow_command_profile,
    activeEntrypoint: process.argv[1]
  });
  return {
    status: commandPath.status,
    ...(commandPath.reasonCode !== undefined
      ? { reasonCode: commandPath.reasonCode }
      : {}),
    profile: commandPath.profile,
    localEntrypoint: commandPath.localEntrypoint,
    activeEntrypoint: commandPath.activeEntrypoint,
    message: commandPath.message,
    pinnedCommand: commandPath.pinnedCommand
  };
}
