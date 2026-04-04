import type { AgentName } from "../../../types/bubble.js";
import type { EmitAskHumanV11Result } from "../askHuman/emitAskHumanV11.js";
import {
  emitAskHumanFromWorkspaceV11 as emitAskHumanFromWorkspace
} from "../askHuman/emitAskHumanV11.js";
import type { EmitConvergedV11Result } from "../converged/emitConvergedV11.js";
import {
  emitConvergedFromWorkspaceV11 as emitConvergedFromWorkspace
} from "../converged/emitConvergedV11.js";
import type { MetaReviewSubmitResultV11 } from "../metaReview/emitMetaReviewV11.js";
import {
  submitMetaReviewResultV11 as submitMetaReviewResult
} from "../metaReview/emitMetaReviewV11.js";
import type { EmitPassV11Result } from "../pass/emitPassV11.js";
import {
  emitPassFromWorkspaceV11 as emitPassFromWorkspace
} from "../pass/emitPassV11.js";
import {
  ActorEmitContextError,
  assertActorEmitContextMatches
} from "../../../core/bubble/actorEmitContext.js";
import type {
  ActorEmitContextSnapshot
} from "../../../core/bubble/actorEmitContext.js";
import type {
  ActorEmitInput,
  HumanQuestionActorEmitInput,
  PassActorEmitInput
} from "../../../types/protocol.js";

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

export interface ResolvedActorEmitInputV11 {
  input: ActorEmitInput;
  authoritativeContext: ActorEmitContextSnapshot;
}

interface ResolvedImplementerPilotActorEmitInputV11 {
  input: PassActorEmitInput | HumanQuestionActorEmitInput;
  authoritativeContext: ActorEmitContextSnapshot;
}

export async function emitImplementerPilotActorProtocolV11(
  resolvedInput: ResolvedImplementerPilotActorEmitInputV11
): Promise<Extract<
  ActorEmitResultV11,
  { kind: "pass" } | { kind: "human_question" }
>> {
  const { input, authoritativeContext: context } = resolvedInput;
  assertActorEmitContextMatches({
    context,
    handoffId: input.handoff_id,
    ...(input.expected_role !== undefined
      ? { expectedRole: input.expected_role }
      : {}),
    ...(input.expected_round !== undefined
      ? { expectedRound: input.expected_round }
      : {}),
    ...(input.expected_state_fingerprint !== undefined
      ? { expectedStateFingerprint: input.expected_state_fingerprint }
      : {})
  });
  if (context.expected_role !== "implementer") {
    throw new ActorEmitContextError(
      "ACTOR_EMIT_CONTEXT_INVALID",
      "ACTOR_EMIT_CONTEXT_INVALID: implementer pilot wrapper requires implementer authority."
    );
  }

  if (input.kind === "pass") {
    return {
      kind: "pass",
      pass: await emitPassFromWorkspace({
        summary: input.summary,
        ...(input.refs !== undefined ? { refs: input.refs } : {}),
        ...(input.intent !== undefined ? { intent: input.intent } : {}),
        ...(input.findings !== undefined ? { findings: input.findings } : {}),
        ...(input.no_findings ? { noFindings: true } : {}),
        authoritativeContext: context,
        cwd: context.worktree_path
      })
    };
  }

  return {
    kind: "human_question",
    human_question: await emitAskHumanFromWorkspace({
      question: input.question,
      ...(input.refs !== undefined ? { refs: input.refs } : {}),
      authoritativeContext: context,
      cwd: context.worktree_path
    })
  };
}

export const implementerPilotActorProtocolV11 = {
  emit: emitImplementerPilotActorProtocolV11
} as const;

function resolveExpectedReviewer(input: {
  activeRole: ActorEmitInput["expected_role"];
  activeAgent: AgentName | null;
}): AgentName | undefined {
  if (input.activeRole !== "reviewer") {
    return undefined;
  }
  if (input.activeAgent === null) {
    throw new Error(
      "ACTOR_EMIT_CONTEXT_INVALID: canonical reviewer authority requires an active reviewer agent."
    );
  }
  return input.activeAgent;
}

export async function emitActorProtocolFromWorkspaceV11(
  resolvedInput: ResolvedActorEmitInputV11
): Promise<ActorEmitResultV11> {
  const { input, authoritativeContext: context } = resolvedInput;
  if (
    context.expected_role === "implementer"
    && (input.kind === "pass" || input.kind === "human_question")
  ) {
    return implementerPilotActorProtocolV11.emit({
      input,
      authoritativeContext: context
    });
  }

  assertActorEmitContextMatches({
    context,
    handoffId: input.handoff_id,
    ...(input.expected_role !== undefined
      ? { expectedRole: input.expected_role }
      : {}),
    ...(input.expected_round !== undefined
      ? { expectedRound: input.expected_round }
      : {}),
    ...(input.expected_state_fingerprint !== undefined
      ? { expectedStateFingerprint: input.expected_state_fingerprint }
      : {})
  });

  if (input.kind === "pass") {
    return {
      kind: "pass",
      pass: await emitPassFromWorkspace({
        summary: input.summary,
        ...(input.refs !== undefined ? { refs: input.refs } : {}),
        ...(input.intent !== undefined ? { intent: input.intent } : {}),
        ...(input.findings !== undefined ? { findings: input.findings } : {}),
        ...(input.no_findings ? { noFindings: true } : {}),
        authoritativeContext: context,
        cwd: context.worktree_path
      })
    };
  }

  if (input.kind === "human_question") {
    return {
      kind: "human_question",
      human_question: await emitAskHumanFromWorkspace({
        question: input.question,
        ...(input.refs !== undefined ? { refs: input.refs } : {}),
        authoritativeContext: context,
        cwd: context.worktree_path
      })
    };
  }

  if (input.kind === "convergence") {
    const expectedReviewer = resolveExpectedReviewer({
      activeRole: context.expected_role,
      activeAgent: context.loaded_state.state.active_agent
    });
    return {
      kind: "convergence",
      convergence: await emitConvergedFromWorkspace({
        summary: input.summary,
        ...(input.refs !== undefined ? { refs: input.refs } : {}),
        ...(input.findings !== undefined ? { findings: input.findings } : {}),
        cwd: context.worktree_path,
        expectedStateFingerprint: context.expected_state_fingerprint,
        expectedRound: context.expected_round,
        ...(expectedReviewer !== undefined ? { expectedReviewer } : {})
      })
    };
  }

  return {
    kind: "meta_review_result",
    meta_review_result: await submitMetaReviewResult({
      bubbleId: input.bubble_id,
      repoPath: input.repo,
      round: input.round,
      recommendation: input.recommendation,
      summary: input.summary,
      ...(input.rework_target_message !== undefined
        ? { rework_target_message: input.rework_target_message }
        : {}),
      report_json: input.report_json,
      ...(input.refs !== undefined ? { refs: input.refs } : {}),
      expectedHandoffId: input.handoff_id,
      ...(input.expected_role !== undefined
        ? { expectedRole: input.expected_role }
        : {}),
      ...(input.expected_round !== undefined
        ? { expectedRound: input.expected_round }
        : {}),
      ...(input.expected_state_fingerprint !== undefined
        ? { expectedStateFingerprint: input.expected_state_fingerprint }
        : {})
    })
  };
}
