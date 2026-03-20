import {
  buildPairflowCommandGuidance
} from "../../../core/runtime/pairflowCommand.js";
import type {
  PairflowCommandProfile,
  ReviewArtifactType
} from "../../../types/bubble.js";

export function buildImplementerStartupPrompt(input: {
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
  taskArtifactPath: string;
  donePackagePath: string;
  reviewArtifactType: ReviewArtifactType;
  pairflowCommandProfile: PairflowCommandProfile;
  ideationPending: boolean;
}): string {
  if (input.ideationPending) {
    return [
      `Pairflow implementer start for bubble ${input.bubbleId}.`,
      "This bubble is ideation-pending (`round=0`).",
      "Do nothing now. Stay idle.",
      "Do not read task files, scan the repository, or search for kickoff sources.",
      "Do not run lifecycle/protocol commands (`pairflow bubble kickoff`, `pairflow pass`, `pairflow ask-human`, `pairflow converged`) unless explicit human instruction arrives.",
      "Wait for explicit human instruction that contains a concrete kickoff task.",
      `Repository: ${input.repoPath}. Worktree: ${input.worktreePath}.`
    ].join(" ");
  }

  const evidenceHandoffGuidance = buildImplementerEvidenceHandoffGuidance(
    input.reviewArtifactType
  );
  return [
    `Pairflow implementer start for bubble ${input.bubbleId}.`,
    `Read task: ${input.taskArtifactPath}.`,
    "Implement in this worktree and run relevant validation before handoff.",
    `Execute pairflow commands from this worktree path only: ${input.worktreePath}.`,
    buildPairflowCommandGuidance(
      input.worktreePath,
      input.pairflowCommandProfile
    ),
    evidenceHandoffGuidance,
    `Keep done package updated at: ${input.donePackagePath}.`,
    "Done package should summarize changes + validation results for final commit handoff.",
    `Repository: ${input.repoPath}. Worktree: ${input.worktreePath}.`,
    "When done, run `pairflow pass --summary \"<what changed + validation>\"` with available evidence `--ref` attachments.",
    "Use `pairflow ask-human --question \"...\"` only for blockers."
  ].join(" ");
}

export function buildImplementerKickoffMessage(input: {
  bubbleId: string;
  worktreePath: string;
  taskArtifactPath: string;
  reviewArtifactType: ReviewArtifactType;
  pairflowCommandProfile: PairflowCommandProfile;
}): string {
  return [
    `# [pairflow] bubble=${input.bubbleId} kickoff.`,
    `Read task file now: ${input.taskArtifactPath}.`,
    "Start implementation immediately in this worktree.",
    buildPairflowCommandGuidance(
      input.worktreePath,
      input.pairflowCommandProfile
    ),
    buildImplementerEvidenceHandoffGuidance(input.reviewArtifactType),
    "When done with validation, hand off with `pairflow pass --summary \"<what changed + validation>\"` and include available evidence `--ref` log paths."
  ].join(" ");
}

export function buildImplementerIdeationKickoffMessage(input: {
  bubbleId: string;
  worktreePath: string;
  taskArtifactPath: string;
  pairflowCommandProfile: PairflowCommandProfile;
}): string {
  return [
    `# [pairflow] bubble=${input.bubbleId} kickoff (ideation pending).`,
    "This bubble is in ideation mode; no implementer action is required.",
    "Stay idle and wait for explicit human instruction.",
    "Do not run `pairflow bubble kickoff` yourself and do not emit implementer/reviewer handoff yet."
  ].join(" ");
}

export function buildImplementerEvidenceHandoffGuidance(
  reviewArtifactType: ReviewArtifactType
): string {
  if (reviewArtifactType === "document") {
    return [
      "This bubble is docs-only (`review_artifact_type=document`), so runtime checks are not required in this round.",
      "Primary artifact rule (docs-only): when the task references an existing source document/task file, refine that file directly (in-place) as the main output.",
      "Do not replace primary artifact refinement with a new standalone review/synthesis document unless the task explicitly requests creating a new file path.",
      "Docs-only scope: choose one mode and keep it consistent in the same PASS.",
      "Mode A (skip-claim): summary says runtime checks were intentionally not executed -> attach no `.pairflow/evidence/*.log` refs.",
      "Mode B (checks executed): if you run validation (for example `pnpm lint`, `pnpm typecheck`, `pnpm test`, or `pnpm check`), make sure evidence logs are written to `.pairflow/evidence/`, attach only refs for commands you actually ran, and do not claim checks were intentionally not executed."
    ].join(" ");
  }

  return [
    "Run validation via `pnpm lint`, `pnpm typecheck`, `pnpm test`, or `pnpm check` so evidence logs are written to `.pairflow/evidence/`.",
    "If evidence logs exist, include them as `--ref` when running `pairflow pass`.",
    "If only a subset of validation commands ran, attach refs for the commands that actually ran and state what was intentionally not executed.",
    "Missing expected evidence logs should be treated as incomplete validation packaging."
  ].join(" ");
}
