/**
 * Ledger name (§4, l0b kernel output). The shape is ch-4-owned — opaque
 * here per the plan §3.1 no-mini-domain rule; ledger §4 is the arbiter.
 */
export type DispatchIntent = unknown;

/** The performer-side seam (IC-E); the scripted actor is its far side. */
export interface ActorAdapter {
  dispatch(intent: DispatchIntent): Promise<void>;
}
