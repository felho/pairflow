import type { AgentName } from "../../../types/bubble.js";
import {
  ActorEmitContextError,
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
import {
  assertActorEmitInputMatchesContext,
  emitConvergenceActorResultV11,
  emitHumanQuestionActorResultV11,
  emitMetaReviewActorResultV11,
  emitPassActorResultV11
} from "./actorProtocolEmitters.js";
import type { EmitAskHumanV11Result } from "../askHuman/emitAskHumanV11.js";
import type { EmitConvergedV11Result } from "../converged/emitConvergedV11.js";
import type { MetaReviewSubmitResultV11 } from "../metaReview/emitMetaReviewV11.js";
import type { EmitPassV11Result } from "../pass/emitPassV11.js";
import type { EmitPassDependencies } from "../pass/passCommandContract.js";
import type { EmitConvergedDependencies } from "../../shared/converged/convergedCommandTypes.js";

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

export interface ActorProtocolDependencies {
  pass?: EmitPassDependencies;
  convergence?: EmitConvergedDependencies;
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
  ,
  dependencies: ActorProtocolDependencies = {}
): Promise<Extract<
  ActorEmitResultV11,
  { kind: "pass" } | { kind: "human_question" }
>> {
  const { input, authoritativeContext: context } = resolvedInput;
  assertActorEmitInputMatchesContext({
    actorInput: input,
    authoritativeContext: context
  });
  if (context.expected_role !== "implementer") {
    throw new ActorEmitContextError(
      "ACTOR_EMIT_CONTEXT_INVALID",
      "ACTOR_EMIT_CONTEXT_INVALID: implementer pilot wrapper requires implementer authority."
    );
  }

  if (input.kind === "pass") {
    return emitPassActorResultV11({
      actorInput: input,
      authoritativeContext: context,
      ...(dependencies.pass !== undefined
        ? { dependencies: dependencies.pass }
        : {})
    });
  }

  return emitHumanQuestionActorResultV11({
    actorInput: input,
    authoritativeContext: context
  });
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
  ,
  dependencies: ActorProtocolDependencies = {}
): Promise<Extract<
  ActorEmitResultV11,
  { kind: "pass" } | { kind: "convergence" }
>> {
  const { input, authoritativeContext: context } = resolvedInput;
  assertActorEmitInputMatchesContext({
    actorInput: input,
    authoritativeContext: context
  });

  if (input.kind === "pass") {
    requireReviewerAuthority(context);
    return emitPassActorResultV11({
      actorInput: input,
      authoritativeContext: context,
      ...(dependencies.pass !== undefined
        ? { dependencies: dependencies.pass }
        : {})
    });
  }

  const expectedReviewer = requireReviewerAuthority(context);
  return emitConvergenceActorResultV11({
    actorInput: input,
    authoritativeContext: context,
    expectedReviewer,
    ...(dependencies.convergence !== undefined
      ? { dependencies: dependencies.convergence }
      : {})
  });
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
  ,
  dependencies: ActorProtocolDependencies = {}
): Promise<Extract<
  ActorEmitResultV11,
  { kind: "meta_review_result" }
>> {
  const { input, authoritativeContext: context } = resolvedInput;
  assertActorEmitInputMatchesContext({
    actorInput: input,
    authoritativeContext: context
  });
  requireMetaReviewerAuthority(context);
  return emitMetaReviewActorResultV11({
    actorInput: input,
    authoritativeContext: context
  });
}

export const metaReviewerActorProtocolV11 = {
  emit: emitMetaReviewerActorProtocolV11
} as const;

async function emitActorProtocolViaAuthorityWrappers(
  resolvedInput: ResolvedActorEmitInputV11
  ,
  dependencies: ActorProtocolDependencies = {}
): Promise<ActorEmitResultV11 | null> {
  const { input, authoritativeContext: context } = resolvedInput;
  if (
    context.expected_role === "implementer" &&
    (input.kind === "pass" || input.kind === "human_question")
  ) {
    return implementerPilotActorProtocolV11.emit({
      input,
      authoritativeContext: context
    }, dependencies);
  }
  if (
    context.expected_role === "reviewer" &&
    (input.kind === "pass" || input.kind === "convergence")
  ) {
    return reviewerActorProtocolV11.emit({
      input,
      authoritativeContext: context
    }, dependencies);
  }
  if (
    context.expected_role === "meta_reviewer" &&
    input.kind === "meta_review_result"
  ) {
    return metaReviewerActorProtocolV11.emit({
      input,
      authoritativeContext: context
    }, dependencies);
  }
  return null;
}

async function emitActorProtocolViaFallbackRouting(
  resolvedInput: ResolvedActorEmitInputV11
  ,
  dependencies: ActorProtocolDependencies = {}
): Promise<ActorEmitResultV11> {
  const { input, authoritativeContext: context } = resolvedInput;
  if (context.expected_role === "meta_reviewer") {
    throw new ActorEmitContextError(
      "ACTOR_EMIT_CONTEXT_INVALID",
      "ACTOR_EMIT_CONTEXT_INVALID: meta_reviewer authority only supports meta_review_result emits."
    );
  }

  if (input.kind === "pass") {
    return emitPassActorResultV11({
      actorInput: input,
      authoritativeContext: context,
      ...(dependencies.pass !== undefined
        ? { dependencies: dependencies.pass }
        : {})
    });
  }

  if (input.kind === "human_question") {
    return emitHumanQuestionActorResultV11({
      actorInput: input,
      authoritativeContext: context
    });
  }

  if (input.kind === "convergence") {
    return emitConvergenceActorResultV11({
      actorInput: input,
      authoritativeContext: context
    });
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
  resolvedInput: ResolvedActorEmitInputV11,
  dependencies: ActorProtocolDependencies = {}
): Promise<ActorEmitResultV11> {
  assertActorEmitInputMatchesContext({
    actorInput: resolvedInput.input,
    authoritativeContext: resolvedInput.authoritativeContext
  });

  const routedResult = await emitActorProtocolViaAuthorityWrappers(
    resolvedInput,
    dependencies
  );
  if (routedResult !== null) {
    return routedResult;
  }
  return emitActorProtocolViaFallbackRouting(resolvedInput, dependencies);
}
