import type { EventEnvelope } from "../domain/index.js";

/**
 * The debug-bundle redaction seam (plan §6.4, packet ch6-P3): applied
 * to every committed envelope before its payload may enter the bundle.
 * P3 ships exactly TWO named policies — the production default
 * (`redactPayloadsPolicy`, floor-side: payloads OMITTED) and the
 * testkit-only `devPassthroughRedactionPolicy` (kept out of the normal
 * production import graph by the ADR-005 lint). This is a public seam:
 * custom implementations are possible by construction — the binding
 * obligation is review-owned (REV-BUNDLE-DEFAULT-POLICY: the normal
 * CLI graph binds the default; pass-through only under cli/dev/, P4).
 */
export interface RedactionPolicy {
  /** Recorded in the bundle so a reader knows what produced it. */
  readonly id: string;
  /** Whether this envelope's payload may enter the bundle. */
  includePayload(envelope: EventEnvelope): boolean;
}
