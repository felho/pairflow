import { buildResumeTranscriptSummary } from "./startCommandResumeSummary.js";
import {
  bootstrapWorktreeWorkspace,
  cleanupWorktreeWorkspace
} from "../../../core/workspace/worktreeManager.js";
import {
  launchBubbleTmuxSession,
  terminateBubbleTmuxSession
} from "../../../core/runtime/tmuxManager.js";
import {
  claimRuntimeSession,
  removeRuntimeSession
} from "../../../core/runtime/sessionsRegistry.js";
import { writeStateSnapshot } from "../../../core/state/stateStore.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type {
  StartBubbleDependencies,
  StartBubbleResult
} from "./startCommandContract.js";
import { createStartBubbleError } from "./startCommandRuntime.js";
import type {
  ReadReviewerBriefArtifactPort,
  ReadReviewerFocusArtifactPort
} from "../../shared/ports/reviewerArtifacts.js";
import type {
  ResolveReviewerTestExecutionDirectivePort
} from "../../shared/ports/reviewerTestEvidenceArtifacts.js";

export type StartBubbleMode = "fresh" | "resume";

const resumableRuntimeStates = new Set([
  "RUNNING",
  "WAITING_HUMAN",
  "READY_FOR_HUMAN_APPROVAL",
  "APPROVED_FOR_COMMIT",
  "COMMITTED"
]);

export interface ResolvedStartBubbleDependencies {
  bootstrap: NonNullable<StartBubbleDependencies["bootstrapWorktreeWorkspace"]>;
  cleanup: NonNullable<StartBubbleDependencies["cleanupWorktreeWorkspace"]>;
  runWorktreeBootstrapCommand:
    NonNullable<StartBubbleDependencies["runWorktreeBootstrapCommand"]>;
  launchTmux: NonNullable<StartBubbleDependencies["launchBubbleTmuxSession"]>;
  terminateTmux:
    NonNullable<StartBubbleDependencies["terminateBubbleTmuxSession"]>;
  isTmuxSessionAlive: NonNullable<StartBubbleDependencies["isTmuxSessionAlive"]>;
  claimSession: NonNullable<StartBubbleDependencies["claimRuntimeSession"]>;
  removeSession: NonNullable<StartBubbleDependencies["removeRuntimeSession"]>;
  writeState: NonNullable<StartBubbleDependencies["writeStateSnapshot"]>;
  buildResumeSummary:
    NonNullable<StartBubbleDependencies["buildResumeTranscriptSummary"]>;
  readReviewerBriefArtifact: ReadReviewerBriefArtifactPort;
  readReviewerFocusArtifact: ReadReviewerFocusArtifactPort;
  resolveReviewerTestExecutionDirective: ResolveReviewerTestExecutionDirectivePort;
}

export interface ResolveStartBubbleDependenciesInput {
  dependencies: StartBubbleDependencies;
  runWorktreeBootstrapCommandDefault:
    NonNullable<StartBubbleDependencies["runWorktreeBootstrapCommand"]>;
  isTmuxSessionAliveDefault:
    NonNullable<StartBubbleDependencies["isTmuxSessionAlive"]>;
}

export function resolveStartBubbleDependencies(
  input: ResolveStartBubbleDependenciesInput
): ResolvedStartBubbleDependencies {
  const { dependencies } = input;

  return {
    bootstrap: dependencies.bootstrapWorktreeWorkspace ?? bootstrapWorktreeWorkspace,
    cleanup: dependencies.cleanupWorktreeWorkspace ?? cleanupWorktreeWorkspace,
    runWorktreeBootstrapCommand:
      dependencies.runWorktreeBootstrapCommand
      ?? input.runWorktreeBootstrapCommandDefault,
    launchTmux: dependencies.launchBubbleTmuxSession ?? launchBubbleTmuxSession,
    terminateTmux:
      dependencies.terminateBubbleTmuxSession ?? terminateBubbleTmuxSession,
    isTmuxSessionAlive:
      dependencies.isTmuxSessionAlive ?? input.isTmuxSessionAliveDefault,
    claimSession: dependencies.claimRuntimeSession ?? claimRuntimeSession,
    removeSession: dependencies.removeRuntimeSession ?? removeRuntimeSession,
    writeState: dependencies.writeStateSnapshot ?? writeStateSnapshot,
    buildResumeSummary:
      dependencies.buildResumeTranscriptSummary ?? buildResumeTranscriptSummary,
    readReviewerBriefArtifact:
      dependencies.readReviewerBriefArtifact
      ?? (() => {
        throw createStartBubbleError({
          reasonCode: "START_DEPENDENCY_MISSING",
          message: "start requires a reviewer brief artifact reader dependency.",
          context: {
            dependency: "readReviewerBriefArtifact",
            stage: "resolve_start_dependencies"
          }
        });
      }),
    readReviewerFocusArtifact:
      dependencies.readReviewerFocusArtifact
      ?? (() => {
        throw createStartBubbleError({
          reasonCode: "START_DEPENDENCY_MISSING",
          message: "start requires a reviewer focus artifact reader dependency.",
          context: {
            dependency: "readReviewerFocusArtifact",
            stage: "resolve_start_dependencies"
          }
        });
      }),
    resolveReviewerTestExecutionDirective:
      dependencies.resolveReviewerTestExecutionDirective
      ?? (() => {
        throw createStartBubbleError({
          reasonCode: "START_DEPENDENCY_MISSING",
          message:
            "start requires a reviewer test-evidence directive resolver dependency.",
          context: {
            dependency: "resolveReviewerTestExecutionDirective",
            stage: "resolve_start_dependencies"
          }
        });
      })
  };
}

export function resolveStartBubbleMode(currentState: string): StartBubbleMode {
  if (currentState === "CREATED") {
    return "fresh";
  }
  if (resumableRuntimeStates.has(currentState)) {
    return "resume";
  }
  throw createStartBubbleError(
    `bubble start requires state CREATED or resumable runtime state (current: ${currentState}).`
  );
}

export function mapStartBubbleResult(input: {
  bubbleId: string;
  state: BubbleStateSnapshot;
  tmuxSessionName: string;
  worktreePath: string;
}): StartBubbleResult {
  return {
    bubbleId: input.bubbleId,
    state: input.state,
    tmuxSessionName: input.tmuxSessionName,
    worktreePath: input.worktreePath
  };
}
