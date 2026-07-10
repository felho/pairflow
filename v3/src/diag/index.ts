import type { DiagnosticsSink } from "../ports/diagnostics.js";

// The non-authoritative diagnostic channel module (PI-4; ADR-001
// reserved home). Types + sink port: packet ch7-P1. The store-backed
// sink + read surface (separate SQLite file, ADR-010): packet ch7-P2,
// `sqliteDiagStore.ts` — the fail-open write half and fail-loud read
// half. Consumers (the tail diag layer, the bundle three-state flip):
// packet ch7-P3. CLI activation on the derived `<db>.diag.sqlite`
// config: packet ch7-P4 (which retired the ch7-P3 interim reader).

export { DiagUnavailableError, openDiagStore } from "./sqliteDiagStore.js";
export type { DiagStoreHandle } from "./sqliteDiagStore.js";

/**
 * The no-op sink. Since ch7-P4 wired the derived-config store into
 * both CLI entrypoints, the production binding that remains is
 * `replay` — hermetic BY RATIFIED DESIGN with NO diag surface (plan
 * §7.5); tests compose it freely. KernelDeps and createIngress
 * REQUIRE a sink (explicit wiring — no optional dep). Trivially
 * satisfies the port's fail-open contract.
 */
export const noopDiagnosticsSink: DiagnosticsSink = {
  emit: () => {
    // Deliberately nothing: observation without a consumer.
  },
};
