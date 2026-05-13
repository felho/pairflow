import type { AgentName } from "../../../../../contracts/kernel/agentIdentity.js";
import type {
  ActorEmitInput,
  ConvergenceActorEmitInput,
  HumanQuestionActorEmitInput,
  MetaReviewResultActorEmitInput,
  PassActorEmitInput
} from "../../actorEmitContract.js";
import {
  assertActorEmitContextMatches
} from "../../../../shared/actorProtocol/actorEmitContext.js";
import type {
  ActorEmitContextSnapshot
} from "../../../../shared/actorProtocol/actorEmitContext.js";
import type { EmitPassDependencies } from "../../../pass/passCommandContract.js";
import type { EmitConvergedDependencies } from "../../../../shared/converged/convergedCommandTypes.js";
import type { MetaReviewCommandDependencies } from "../../../../shared/metaReview/metaReviewCommandContract.js";
import type { EmitAskHumanDependencies } from "../../../askHuman/askHumanCommandContract.js";
import {
  emitAskHumanFromWorkspace
} from "../../../askHuman/askHumanCommandApi.js";
import {
  emitConvergedFromWorkspaceCommandOrchestration as emitConvergedFromWorkspace
} from "../../../converged/convergedCommandOrchestration.js";
import {
  submitMetaReviewResult
} from "../../../metaReview/metaReviewCommandSubmitRuntime.js";
import {
  emitPassFromWorkspace
} from "../../../pass/passCommandOrchestration.js";
import type { EmitAskHumanResult } from "../../../askHuman/askHumanCommandApi.js";
import type { EmitConvergedResult } from "../../../converged/convergedCommandOrchestration.js";
import type { MetaReviewSubmitResult } from "../../../../shared/metaReview/metaReviewCommandContract.js";
import type { EmitPassResult } from "../../../pass/passCommandOrchestration.js";

export type ActorEmitResult =
  | {
      kind: "pass";
      pass: EmitPassResult;
    }
  | {
      kind: "human_question";
      human_question: EmitAskHumanResult;
    }
  | {
      kind: "convergence";
      convergence: EmitConvergedResult;
    }
  | {
      kind: "meta_review_result";
      meta_review_result: MetaReviewSubmitResult;
    };

export function assertActorEmitInputMatchesContext(input: {
  actorInput: ActorEmitInput;
  authoritativeContext: ActorEmitContextSnapshot;
}): void {
  const { actorInput, authoritativeContext: context } = input;
  assertActorEmitContextMatches({
    context,
    handoffId: actorInput.handoff_id,
    executionId: actorInput.execution_id,
    ...(actorInput.expected_role !== undefined
      ? { expectedRole: actorInput.expected_role }
      : {}),
    ...(actorInput.expected_round !== undefined
      ? { expectedRound: actorInput.expected_round }
      : {}),
    ...(actorInput.expected_state_fingerprint !== undefined
      ? { expectedStateFingerprint: actorInput.expected_state_fingerprint }
      : {})
  });
}

export async function emitPassActorResult(input: {
  actorInput: PassActorEmitInput;
  authoritativeContext: ActorEmitContextSnapshot;
  dependencies?: EmitPassDependencies;
}): Promise<Extract<ActorEmitResult, { kind: "pass" }>> {
  const { actorInput, authoritativeContext: context } = input;
  return {
    kind: "pass",
    pass: await emitPassFromWorkspace({
      summary: actorInput.summary,
      ...(actorInput.refs !== undefined ? { refs: actorInput.refs } : {}),
      ...(actorInput.intent !== undefined ? { intent: actorInput.intent } : {}),
      ...(actorInput.findings !== undefined ? { findings: actorInput.findings } : {}),
      ...(actorInput.no_findings ? { noFindings: true } : {}),
      authoritativeContext: context,
      cwd: context.worktree_path
    }, input.dependencies)
  };
}

export async function emitHumanQuestionActorResult(input: {
  actorInput: HumanQuestionActorEmitInput;
  authoritativeContext: ActorEmitContextSnapshot;
  dependencies?: EmitAskHumanDependencies;
}): Promise<Extract<ActorEmitResult, { kind: "human_question" }>> {
  const { actorInput, authoritativeContext: context } = input;
  return {
    kind: "human_question",
    human_question: await emitAskHumanFromWorkspace(
      {
        question: actorInput.question,
        ...(actorInput.refs !== undefined ? { refs: actorInput.refs } : {}),
        authoritativeContext: context,
        cwd: context.worktree_path
      },
      input.dependencies
    )
  };
}

export async function emitConvergenceActorResult(input: {
  actorInput: ConvergenceActorEmitInput;
  authoritativeContext: ActorEmitContextSnapshot;
  expectedReviewer?: AgentName | undefined;
  dependencies?: EmitConvergedDependencies;
}): Promise<Extract<ActorEmitResult, { kind: "convergence" }>> {
  const {
    actorInput,
    authoritativeContext: context,
    expectedReviewer
  } = input;
  return {
    kind: "convergence",
    convergence: await emitConvergedFromWorkspace({
      summary: actorInput.summary,
      ...(actorInput.refs !== undefined ? { refs: actorInput.refs } : {}),
      ...(actorInput.findings !== undefined ? { findings: actorInput.findings } : {}),
      authoritativeContext: context,
      cwd: context.worktree_path,
      expectedStateFingerprint:
        actorInput.expected_state_fingerprint ?? context.expected_state_fingerprint,
      expectedRound: actorInput.expected_round ?? context.expected_round,
      ...(expectedReviewer !== undefined ? { expectedReviewer } : {})
    }, input.dependencies)
  };
}

export async function emitMetaReviewActorResult(input: {
  actorInput: MetaReviewResultActorEmitInput;
  authoritativeContext: ActorEmitContextSnapshot;
  dependencies?: MetaReviewCommandDependencies;
}): Promise<Extract<ActorEmitResult, { kind: "meta_review_result" }>> {
  const { actorInput, authoritativeContext: context } = input;
  return {
    kind: "meta_review_result",
    meta_review_result: await submitMetaReviewResult({
      bubbleId: actorInput.bubble_id,
      repoPath: actorInput.repo,
      cwd: context.worktree_path,
      expectedExecutionId: context.execution_id,
      round: actorInput.round,
      recommendation: actorInput.recommendation,
      summary: actorInput.summary,
      ...(actorInput.rework_target_message !== undefined
        ? { rework_target_message: actorInput.rework_target_message }
        : {}),
      report_json: actorInput.report_json,
      ...(actorInput.refs !== undefined ? { refs: actorInput.refs } : {}),
      expectedHandoffId: context.handoff_id,
      expectedRole: context.expected_role,
      expectedRound: context.expected_round,
      expectedStateFingerprint: context.expected_state_fingerprint
    }, input.dependencies)
  };
}
