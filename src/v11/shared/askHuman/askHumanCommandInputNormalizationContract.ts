import type { ActorEmitContextSnapshot } from "../../../core/bubble/actorEmitContext.js";

export interface NormalizeAskHumanCommandInputInput {
  question: string;
  refs?: string[] | undefined;
  cwd?: string | undefined;
  authoritativeContext?: ActorEmitContextSnapshot | undefined;
  now?: Date | undefined;
}

export interface NormalizedAskHumanCommandInput {
  question: string;
  refs?: string[] | undefined;
  cwd?: string | undefined;
  authoritativeContext?: ActorEmitContextSnapshot | undefined;
  now: Date;
}
