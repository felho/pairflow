import type { RedactionPolicy } from "../ports/redaction.js";

/**
 * Testkit-ONLY named pass-through (packet ch6-P3): the testkit home
 * keeps it OUT of the normal production import graph (ADR-005 lint).
 * Explicit opt-in for tests and the ch-6 dev entrypoint (cli/dev/,
 * P4); the normal CLI binds the production default
 * (REV-BUNDLE-DEFAULT-POLICY).
 */
export const devPassthroughRedactionPolicy: RedactionPolicy = {
  id: "dev-passthrough",
  includePayload: () => true,
};
