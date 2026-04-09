const startCommandPromptRuntimePromise = Promise.all([
  import("../../../core/runtime/agentCommand.js"),
  import("../../../core/runtime/pairflowCommand.js")
]).then(([agentCommand, pairflowCommand]) => ({
  buildAgentCommand: agentCommand.buildAgentCommand,
  buildPairflowCommandGuidance:
    pairflowCommand.buildPairflowCommandGuidance,
  buildPinnedPairflowCommand: pairflowCommand.buildPinnedPairflowCommand
}));

const startCommandPromptRuntime = await startCommandPromptRuntimePromise;

export const buildAgentCommand = startCommandPromptRuntime.buildAgentCommand;
export const buildPairflowCommandGuidance =
  startCommandPromptRuntime.buildPairflowCommandGuidance;
export const buildPinnedPairflowCommand =
  startCommandPromptRuntime.buildPinnedPairflowCommand;
