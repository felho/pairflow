import type { AgentName } from "../../../types/bubble.js";
import type {
  ActorEmitInput,
  ConvergenceActorEmitInput,
  HumanQuestionActorEmitInput,
  MetaReviewResultActorEmitInput,
  PassActorEmitInput
} from "../../../types/protocol.js";
import {
  assertActorEmitContextMatches
} from "../../shared/actorProtocol/actorEmitContext.js";
import type {
  ActorEmitContextSnapshot
} from "../../shared/actorProtocol/actorEmitContext.js";
import type { EmitPassDependencies } from "../pass/passCommandContract.js";
import type { EmitConvergedDependencies } from "../../shared/converged/convergedCommandTypes.js";
import {
  emitAskHumanFromWorkspaceV11 as emitAskHumanFromWorkspace
} from "../askHuman/emitAskHumanV11.js";
import {
  emitConvergedFromWorkspaceV11 as emitConvergedFromWorkspace
} from "../converged/emitConvergedV11.js";
import {
  submitMetaReviewResultV11 as submitMetaReviewResult
} from "../metaReview/emitMetaReviewV11.js";
import {
  emitPassFromWorkspaceV11 as emitPassFromWorkspace
} from "../pass/emitPassV11.js";
import type { EmitAskHumanV11Result } from "../askHuman/emitAskHumanV11.js";
import type { EmitConvergedV11Result } from "../converged/emitConvergedV11.js";
import type { MetaReviewSubmitResultV11 } from "../metaReview/emitMetaReviewV11.js";
import type { EmitPassV11Result } from "../pass/emitPassV11.js";

export type ActorEmitResultV11 =
  | {
      kind: "pass";
      pass: EmitPassV11Result;
    }
  | {
      kind: "human_question";
      human_question: EmitAskHumanV11Result;
    }
  | {
      kind: "convergence";
      convergence: EmitConvergedV11Result;
    }
  | {
      kind: "meta_review_result";
      meta_review_result: MetaReviewSubmitResultV11;
    };

export function assertActorEmitInputMatchesContext(input: {
  actorInput: ActorEmitInput;
  authoritativeContext: ActorEmitContextSnapshot;
}): void {
  const { actorInput, authoritativeContext: context } = input;
  assertActorEmitContextMatches({
    context,
    handoffId: actorInput.handoff_id,
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

export async function emitPassActorResultV11(input: {
  actorInput: PassActorEmitInput;
  authoritativeContext: ActorEmitContextSnapshot;
  dependencies?: EmitPassDependencies;
}): Promise<Extract<ActorEmitResultV11, { kind: "pass" }>> {
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

export async function emitHumanQuestionActorResultV11(input: {
  actorInput: HumanQuestionActorEmitInput;
  authoritativeContext: ActorEmitContextSnapshot;
}): Promise<Extract<ActorEmitResultV11, { kind: "human_question" }>> {
  const { actorInput, authoritativeContext: context } = input;
  return {
    kind: "human_question",
    human_question: await emitAskHumanFromWorkspace({
      question: actorInput.question,
      ...(actorInput.refs !== undefined ? { refs: actorInput.refs } : {}),
      authoritativeContext: context,
      cwd: context.worktree_path
    })
  };
}

export async function emitConvergenceActorResultV11(input: {
  actorInput: ConvergenceActorEmitInput;
  authoritativeContext: ActorEmitContextSnapshot;
  expectedReviewer?: AgentName | undefined;
  dependencies?: EmitConvergedDependencies;
}): Promise<Extract<ActorEmitResultV11, { kind: "convergence" }>> {
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

export async function emitMetaReviewActorResultV11(input: {
  actorInput: MetaReviewResultActorEmitInput;
  authoritativeContext: ActorEmitContextSnapshot;
}): Promise<Extract<ActorEmitResultV11, { kind: "meta_review_result" }>> {
  const { actorInput, authoritativeContext: context } = input;
  return {
    kind: "meta_review_result",
    meta_review_result: await submitMetaReviewResult({
      bubbleId: actorInput.bubble_id,
      repoPath: actorInput.repo,
      cwd: context.worktree_path,
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
    })
  };
}
