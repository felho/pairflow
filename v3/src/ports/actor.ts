import type { DispatchIntent } from "../domain/index.js";

export type { DispatchIntent };

/** The performer-side seam (IC-E); the scripted actor is its far side. */
export interface ActorAdapter {
  dispatch(intent: DispatchIntent): Promise<void>;
}
