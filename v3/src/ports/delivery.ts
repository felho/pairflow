import type { DispatchIntent, Outcome } from "../domain/index.js";

/**
 * The delivery executor seam (K1; packet ch9-p3a — NEW, flag F2). The
 * delivery core hands a re-derived DispatchIntent plus the durably-minted
 * attempt identity to an INJECTED executor and consumes ONLY the closed
 * result vocabulary below — it never branches on a concrete executor type
 * (REV-E-NO-ADAPTER-BRANCH). ch9-P3b's real actor adapter maps C17-C23's
 * spawn/handoff/result mechanics onto exactly this triple + union; the
 * testkit's scripted executor is the deterministic far side (K3).
 */
export interface AttemptExecutorInput {
  readonly intent: DispatchIntent;
  /** The durable attempt id minted in the B1 attempt-start transaction. */
  readonly attemptId: string;
  /** The live session name recorded in the same B1 transaction (opaque here;
   * the C23 derivation binds at ch9-P3b/P4). */
  readonly sessionName: string;
}

/**
 * The CLOSED attempt-result union (K1). The members ARE the C15/C16
 * attempt-outcome classes:
 *   - `submitted` carries the kernel `Outcome` of the actor's emitted op
 *     (CF2 classifies it: committed/duplicate → confirmed; stale /
 *     non-duplicate rejection → unconfirmed-with-recorded-outcome;
 *     `not_active` → mooted).
 *   - `no_output` — exit 0 without a readable/parseable emitted op (CF2 →
 *     unconfirmed, the frozen-budget lane).
 *   - `name_collision` — the attempt's session name was already occupied in
 *     the host namespace, reported BEFORE any spawn side effect (C16's
 *     host-tmux collision half — B6's non-consuming in-place remint lane).
 *   - `infra_failure` — spawn/infra error, nonzero exit, the runner's own
 *     delivery-timeout kill, or a foreign `code: null` kill (C21's
 *     `runner_error` class; BARE — no `sys:` token ever rides the delivery
 *     path). Consumes an attempt (B3).
 */
export type AttemptResult =
  | { readonly kind: "submitted"; readonly outcome: Outcome }
  | { readonly kind: "no_output" }
  | { readonly kind: "name_collision" }
  | {
      readonly kind: "infra_failure";
      readonly class: "spawn_infra" | "nonzero_exit" | "own_timeout" | "foreign_kill";
    };

export interface AttemptExecutor {
  execute(input: AttemptExecutorInput): Promise<AttemptResult>;
}
