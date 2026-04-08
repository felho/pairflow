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
} from "../../shared/actorProtocol/actorEmitContext.js";
import type {
  ActorEmitContextSnapshot
} from "../../shared/actorProtocol/actorEmitContext.js";
import type {
  ActorEmitInput,
  ConvergenceActorEmitInput,
  HumanQuestionActorEmitInput,
  MetaReviewResultActorEmitInput,
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

interface ResolvedReviewerActorEmitInputV11 {
  input: PassActorEmitInput | ConvergenceActorEmitInput;
  authoritativeContext: ActorEmitContextSnapshot;
}

interface ResolvedMetaReviewerActorEmitInputV11 {
  input: MetaReviewResultActorEmitInput;
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

function requireReviewerAuthority(
  context: ActorEmitContextSnapshot
): AgentName {
  if (context.expected_role !== "reviewer") {
    throw new ActorEmitContextError(
      "ACTOR_EMIT_CONTEXT_INVALID",
      "ACTOR_EMIT_CONTEXT_INVALID: reviewer wrapper requires reviewer authority."
    );
  }
  const activeAgent = context.loaded_state.state.active_agent;
  if (activeAgent === null) {
    throw new ActorEmitContextError(
      "ACTOR_EMIT_CONTEXT_INVALID",
      "ACTOR_EMIT_CONTEXT_INVALID: canonical reviewer authority requires an active reviewer agent."
    );
  }
  return activeAgent;
}

export async function emitReviewerActorProtocolV11(
  resolvedInput: ResolvedReviewerActorEmitInputV11
): Promise<Extract<
  ActorEmitResultV11,
  { kind: "pass" } | { kind: "convergence" }
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

  if (input.kind === "pass") {
    requireReviewerAuthority(context);
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

  const expectedReviewer = requireReviewerAuthority(context);
  return {
    kind: "convergence",
    convergence: await emitConvergedFromWorkspace({
      summary: input.summary,
      ...(input.refs !== undefined ? { refs: input.refs } : {}),
      ...(input.findings !== undefined ? { findings: input.findings } : {}),
      authoritativeContext: context,
      cwd: context.worktree_path,
      expectedStateFingerprint:
        input.expected_state_fingerprint ?? context.expected_state_fingerprint,
      expectedRound: input.expected_round ?? context.expected_round,
      expectedReviewer
    })
  };
}

export const reviewerActorProtocolV11 = {
  emit: emitReviewerActorProtocolV11
} as const;

function requireMetaReviewerAuthority(
  context: ActorEmitContextSnapshot
): void {
  if (context.expected_role !== "meta_reviewer") {
    throw new ActorEmitContextError(
      "ACTOR_EMIT_CONTEXT_INVALID",
      "ACTOR_EMIT_CONTEXT_INVALID: meta-reviewer wrapper requires meta_reviewer authority."
    );
  }

  const activeAgent = context.loaded_state.state.active_agent;
  if (activeAgent === null) {
    // Recovery may keep canonical execution authority while clearing live ownership.
    return;
  }
  if (activeAgent !== "codex") {
    throw new ActorEmitContextError(
      "ACTOR_EMIT_CONTEXT_INVALID",
      `ACTOR_EMIT_CONTEXT_INVALID: canonical meta-reviewer authority requires codex when active_agent is present (active_agent=${activeAgent}).`
    );
  }
}

export async function emitMetaReviewerActorProtocolV11(
  resolvedInput: ResolvedMetaReviewerActorEmitInputV11
): Promise<Extract<
  ActorEmitResultV11,
  { kind: "meta_review_result" }
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
  requireMetaReviewerAuthority(context);

  return {
    kind: "meta_review_result",
    meta_review_result: await submitMetaReviewResult({
      bubbleId: input.bubble_id,
      repoPath: input.repo,
      cwd: context.worktree_path,
      round: input.round,
      recommendation: input.recommendation,
      summary: input.summary,
      ...(input.rework_target_message !== undefined
        ? { rework_target_message: input.rework_target_message }
        : {}),
      report_json: input.report_json,
      ...(input.refs !== undefined ? { refs: input.refs } : {}),
      expectedHandoffId: context.handoff_id,
      expectedRole: context.expected_role,
      expectedRound: context.expected_round,
      expectedStateFingerprint: context.expected_state_fingerprint
    })
  };
}

export const metaReviewerActorProtocolV11 = {
  emit: emitMetaReviewerActorProtocolV11
} as const;

async function emitActorProtocolViaAuthorityWrappers(
  resolvedInput: ResolvedActorEmitInputV11
): Promise<ActorEmitResultV11 | null> {
  const { input, authoritativeContext: context } = resolvedInput;
  if (
    context.expected_role === "implementer" &&
    (input.kind === "pass" || input.kind === "human_question")
  ) {
    return implementerPilotActorProtocolV11.emit({
      input,
      authoritativeContext: context
    });
  }
  if (
    context.expected_role === "reviewer" &&
    (input.kind === "pass" || input.kind === "convergence")
  ) {
    return reviewerActorProtocolV11.emit({
      input,
      authoritativeContext: context
    });
  }
  if (
    context.expected_role === "meta_reviewer" &&
    input.kind === "meta_review_result"
  ) {
    return metaReviewerActorProtocolV11.emit({
      input,
      authoritativeContext: context
    });
  }
  return null;
}

async function emitActorProtocolViaFallbackRouting(
  resolvedInput: ResolvedActorEmitInputV11
): Promise<ActorEmitResultV11> {
  const { input, authoritativeContext: context } = resolvedInput;
  if (context.expected_role === "meta_reviewer") {
    throw new ActorEmitContextError(
      "ACTOR_EMIT_CONTEXT_INVALID",
      "ACTOR_EMIT_CONTEXT_INVALID: meta_reviewer authority only supports meta_review_result emits."
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
    return {
      kind: "convergence",
      convergence: await emitConvergedFromWorkspace({
        summary: input.summary,
        ...(input.refs !== undefined ? { refs: input.refs } : {}),
        ...(input.findings !== undefined ? { findings: input.findings } : {}),
        authoritativeContext: context,
        cwd: context.worktree_path,
        expectedStateFingerprint: context.expected_state_fingerprint,
        expectedRound: context.expected_round
      })
    };
  }

  if (input.kind === "meta_review_result") {
    throw new ActorEmitContextError({
      reasonCode: "ACTOR_EMIT_CONTEXT_INVALID",
      message:
        "ACTOR_EMIT_CONTEXT_INVALID: meta-reviewer wrapper requires meta_reviewer authority.",
      context: {
        route: "emitActorProtocolViaAuthorityWrappers",
        expectedAuthority: "meta_reviewer",
        receivedKind: String(input.kind)
      }
    });
  }

  throw new ActorEmitContextError({
    reasonCode: "ACTOR_EMIT_CONTEXT_INVALID",
    message: "ACTOR_EMIT_CONTEXT_INVALID: unsupported actor emit kind.",
    context: {
      route: "emitActorProtocolViaAuthorityWrappers"
    }
  });
}

export async function emitActorProtocolFromWorkspaceV11(
  resolvedInput: ResolvedActorEmitInputV11
): Promise<ActorEmitResultV11> {
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

  const routedResult = await emitActorProtocolViaAuthorityWrappers(resolvedInput);
  if (routedResult !== null) {
    return routedResult;
  }
  return emitActorProtocolViaFallbackRouting(resolvedInput);
}
