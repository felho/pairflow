const startCommandPromptRuntimePromise = Promise.all([
  import("../../shared/command/agentCommand.js"),
  import("../../shared/command/pairflowCommandBootstrap.js")
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
