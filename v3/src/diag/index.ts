import type { DiagnosticsSink } from "../ports/diagnostics.js";

// The non-authoritative diagnostic channel module (PI-4; ADR-001
// reserved home). Types + sink port: packet ch7-P1. The store-backed
// sink + read surface (separate SQLite file, ADR-010): packet ch7-P2,
// `sqliteDiagStore.ts` — the fail-open write half and fail-loud read
// half.

export { DiagUnavailableError, openDiagStore } from "./sqliteDiagStore.js";
export type { DiagStoreHandle } from "./sqliteDiagStore.js";

/**
 * Production placeholder sink. The CLI keeps binding this until ch7-P4
 * wires the store-backed sink together with the derived diag-DB config
 * (`<db>.diag.sqlite`, §7.5); wiring the store here without that path
 * rule would mint an ad-hoc config lane. KernelDeps and createIngress
 * REQUIRE a sink (explicit wiring — no optional dep), so composition
 * roots bind this until then. Trivially satisfies the port's fail-open
 * contract.
 */
export const noopDiagnosticsSink: DiagnosticsSink = {
  emit: () => {
    // Deliberately nothing: observation without a consumer yet.
  },
};
