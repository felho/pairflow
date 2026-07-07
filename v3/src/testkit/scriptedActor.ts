/**
 * The ingress seam the scripted actor plays against. The kernel does not
 * exist yet (ch 4): the seam is a parameter — contract tests inject the
 * real ingress later, kit self-tests inject a recording sink. Envelope and
 * outcome stay opaque (plan §3.1 no-mini-domain rule).
 */
export type DeliverFn = (envelope: unknown) => Promise<unknown>;

export interface ScriptedActor {
  /**
   * Plays the scripted envelopes strictly in order — each delivery awaits
   * the previous outcome — and returns the per-step outcomes. A deliver
   * failure propagates and stops the script.
   */
  play(deliver: DeliverFn): Promise<unknown[]>;
}

export function createScriptedActor(script: readonly unknown[]): ScriptedActor {
  return {
    async play(deliver) {
      const outcomes: unknown[] = [];
      for (const envelope of script) {
        outcomes.push(await deliver(envelope));
      }
      return outcomes;
    },
  };
}
