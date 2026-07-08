import type { DiagnosticsSink } from "../ports/diagnostics.js";

// The non-authoritative diagnostic channel module (PI-4; ADR-001
// reserved home). First content: packet ch7-P1. The store-backed sink
// (separate SQLite file, ADR-010) lands with ch7-P2.

/**
 * Production placeholder until the P2 store-backed sink: KernelDeps
 * and createIngress REQUIRE a sink (explicit wiring — no optional
 * dep), so composition roots bind this until persistence exists.
 * Trivially satisfies the port's fail-open contract.
 */
export const noopDiagnosticsSink: DiagnosticsSink = {
  emit: () => {
    // Deliberately nothing: observation without a consumer yet.
  },
};
