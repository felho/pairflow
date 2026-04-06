import type { ActorEmitContextSnapshot } from "../actorProtocol/actorEmitContext.js";

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
