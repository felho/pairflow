import {
  buildPairflowCommandGuidance
} from "./startCommandPromptRuntime.js";
import {
  buildLaunchWorkspaceCommandScopeLine,
  buildRepositoryLaunchWorkspaceLine
} from "./startCommandWorkspacePromptLines.js";
import type {
  PairflowCommandProfile,
  ReviewArtifactType
} from "../../../types/bubble.js";

function buildCanonicalActorEmitLookupGuidance(input: {
  bubbleId: string;
  repoPath: string;
}): string {
  return `Before direct canonical emit, fetch fresh actor authority via \`pairflow bubble status --id ${input.bubbleId} --repo ${input.repoPath} --json\` and copy \`executionContext.handoffId\` (plus optional guards) from the JSON output. If you do not have an explicit authority snapshot yet, refresh status and wait for a current handoff instead of guessing or using removed aliases.`;
}

export function buildImplementerStartupPrompt(input: {
  bubbleId: string;
  repoPath: string;
  workspacePath: string;
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
      "Do not run lifecycle/protocol commands (`pairflow bubble kickoff`, `pairflow agent emit`) unless explicit human instruction arrives.",
      "Wait for explicit human instruction that contains a concrete kickoff task.",
      buildRepositoryLaunchWorkspaceLine({
        repoPath: input.repoPath,
        workspacePath: input.workspacePath
      })
    ].join(" ");
  }

  const evidenceHandoffGuidance = buildImplementerEvidenceHandoffGuidance(
    input.reviewArtifactType
  );
  return [
    `Pairflow implementer start for bubble ${input.bubbleId}.`,
    `Read task: ${input.taskArtifactPath}.`,
    "Implement in this launch workspace and run relevant validation before handoff.",
    buildLaunchWorkspaceCommandScopeLine(input.workspacePath),
    buildPairflowCommandGuidance(
      input.workspacePath,
      input.pairflowCommandProfile
    ),
    evidenceHandoffGuidance,
    `Keep done package updated at: ${input.donePackagePath}.`,
    "Done package should summarize changes + validation results for final commit handoff.",
    buildRepositoryLaunchWorkspaceLine({
      repoPath: input.repoPath,
      workspacePath: input.workspacePath
    }),
    buildCanonicalActorEmitLookupGuidance({
      bubbleId: input.bubbleId,
      repoPath: input.repoPath
    }),
    "When done, run `pairflow agent emit --kind pass --repo <repo> --bubble-id <id> --handoff-id <handoff-id> --summary \"<what changed + validation>\"` with available evidence `--ref` attachments.",
    "Use `pairflow agent emit --kind human_question --repo <repo> --bubble-id <id> --handoff-id <handoff-id> --question \"...\"` only for blockers."
  ].join(" ");
}

export function buildImplementerKickoffMessage(input: {
  bubbleId: string;
  workspacePath: string;
  taskArtifactPath: string;
  reviewArtifactType: ReviewArtifactType;
  pairflowCommandProfile: PairflowCommandProfile;
}): string {
  return [
    `# [pairflow] bubble=${input.bubbleId} kickoff.`,
    `Read task file now: ${input.taskArtifactPath}.`,
    "Start implementation immediately in this launch workspace (Phase 1C1 no-split worktree root).",
    buildPairflowCommandGuidance(
      input.workspacePath,
      input.pairflowCommandProfile
    ),
    buildImplementerEvidenceHandoffGuidance(input.reviewArtifactType),
    buildCanonicalActorEmitLookupGuidance({
      bubbleId: input.bubbleId,
      repoPath: "<repo>"
    }),
    "When done with validation, hand off with `pairflow agent emit --kind pass --repo <repo> --bubble-id <id> --handoff-id <handoff-id> --summary \"<what changed + validation>\"` and include available evidence `--ref` log paths."
  ].join(" ");
}

export function buildImplementerIdeationKickoffMessage(input: {
  bubbleId: string;
  workspacePath: string;
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
    "If evidence logs exist, include them as `--ref` when running `pairflow agent emit --kind pass`.",
    "If only a subset of validation commands ran, attach refs for the commands that actually ran and state what was intentionally not executed.",
    "Missing expected evidence logs should be treated as incomplete validation packaging."
  ].join(" ");
}
