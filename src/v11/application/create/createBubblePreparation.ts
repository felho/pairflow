import { generateBubbleInstanceId } from "../../shared/bubble/bubbleInstanceId.js";
import type {
  BubbleCreateInput,
  ResolvedTaskInput
} from "./createCommandContract.js";
import type { CreateBubbleConfigInput } from "./createCommandRuntime.js";

export interface PreparedCreateBubbleInput {
  bubbleBranch: string;
  ideationMode: boolean;
  accuracyCritical: boolean;
  bubbleConfigInput: CreateBubbleConfigInput;
}

export function prepareCreateBubbleInput(input: {
  command: BubbleCreateInput;
  createdAt: Date;
  repoPath: string;
  baseBranch: string;
  reviewArtifactType: CreateBubbleConfigInput["reviewArtifactType"];
  task: ResolvedTaskInput;
  executorRemote?: string;
}): PreparedCreateBubbleInput {
  const bubbleBranch = `bubble/${input.command.id}`;
  const ideationMode = input.command.ideation === true;
  const accuracyCritical = input.command.accuracyCritical === true;

  const bubbleConfigInput: CreateBubbleConfigInput = {
    id: input.command.id,
    bubbleInstanceId: generateBubbleInstanceId(input.createdAt),
    repoPath: input.repoPath,
    baseBranch: input.baseBranch,
    bubbleBranch,
    accuracyCritical,
    reviewArtifactType: input.reviewArtifactType,
    ...(ideationMode
      ? {
          ideationMode: true,
          ideationStartedAt: input.createdAt.toISOString()
        }
      : {})
  };

  if (input.command.implementer !== undefined) {
    bubbleConfigInput.implementer = input.command.implementer;
  }
  if (input.command.reviewer !== undefined) {
    bubbleConfigInput.reviewer = input.command.reviewer;
  }
  if (input.command.metaReviewer !== undefined) {
    bubbleConfigInput.metaReviewer = input.command.metaReviewer;
  }
  if (input.command.watchdogTimeoutMinutes !== undefined) {
    bubbleConfigInput.watchdogTimeoutMinutes =
      input.command.watchdogTimeoutMinutes;
  }
  if (input.command.maxRounds !== undefined) {
    bubbleConfigInput.maxRounds = input.command.maxRounds;
  }
  if (input.command.severityGateRound !== undefined) {
    bubbleConfigInput.severityGateRound = input.command.severityGateRound;
  }
  if (input.command.reviewerContextMode !== undefined) {
    bubbleConfigInput.reviewerContextMode = input.command.reviewerContextMode;
  }
  if (input.command.reviewPolicy !== undefined) {
    bubbleConfigInput.reviewPolicy = input.command.reviewPolicy;
  }
  if (input.command.docContractGates !== undefined) {
    bubbleConfigInput.docContractGates = input.command.docContractGates;
  }
  if (input.command.testCommand !== undefined) {
    bubbleConfigInput.testCommand = input.command.testCommand;
  }
  if (input.command.typecheckCommand !== undefined) {
    bubbleConfigInput.typecheckCommand = input.command.typecheckCommand;
  }
  if (input.command.bootstrapCommand !== undefined) {
    bubbleConfigInput.bootstrapCommand = input.command.bootstrapCommand;
  }
  if (input.command.openCommand !== undefined) {
    bubbleConfigInput.openCommand = input.command.openCommand;
  }
  if (input.command.pairflowCommandProfile !== undefined) {
    bubbleConfigInput.pairflowCommandProfile = input.command.pairflowCommandProfile;
  }
  if (input.executorRemote !== undefined) {
    bubbleConfigInput.executorRemote = input.executorRemote;
  }

  return {
    bubbleBranch,
    ideationMode,
    accuracyCritical,
    bubbleConfigInput
  };
}
