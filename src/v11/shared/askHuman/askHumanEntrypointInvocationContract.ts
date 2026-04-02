import type { ActorEmitContextSnapshot } from "../../../core/bubble/actorEmitContext.js";

export interface BuildAskHumanEntrypointInvocationInput {
  normalizedInput: {
    question: string;
    refs?: string[] | undefined;
    cwd?: string | undefined;
    authoritativeContext?: ActorEmitContextSnapshot | undefined;
    now: Date;
  };
  createError: PairflowCreateCommandError;
}
