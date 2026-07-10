import type { DiagnosticsReader, DiagnosticsSink } from "../ports/diagnostics.js";

// The non-authoritative diagnostic channel module (PI-4; ADR-001
// reserved home). Types + sink port: packet ch7-P1. The store-backed
// sink + read surface (separate SQLite file, ADR-010): packet ch7-P2,
// `sqliteDiagStore.ts` — the fail-open write half and fail-loud read
// half. Consumers (the tail diag layer, the bundle three-state flip):
// packet ch7-P3.

import { DiagUnavailableError } from "./sqliteDiagStore.js";

export { DiagUnavailableError, openDiagStore } from "./sqliteDiagStore.js";
export type { DiagStoreHandle } from "./sqliteDiagStore.js";

/**
 * Production placeholder sink. The CLI keeps binding this until ch7-P4
 * wires the store-backed sink AND reader together with the derived
 * diag-DB config (`<db>.diag.sqlite`, §7.5); wiring the store here
 * without that path rule would mint an ad-hoc config lane. KernelDeps
 * and createIngress REQUIRE a sink (explicit wiring — no optional dep),
 * so composition roots bind this until then. Trivially satisfies the
 * port's fail-open contract.
 */
export const noopDiagnosticsSink: DiagnosticsSink = {
  emit: () => {
    // Deliberately nothing: observation without a consumer yet.
  },
};

/**
 * Interim production reader (packet ch7-P3, lane X1): the CLI bundle
 * verbs bind this until ch7-P4 wires the store-backed reader on the
 * derived config. An unwired channel is NOT known-empty (the §7.3
 * duality), so both reads reject `DiagUnavailableError("open_failed")`
 * — operator-visible as `rejectedInputs = unavailable(open_failed)`.
 * The token pick is the packet's STOP-1 approve-ratified decision
 * (flag 1); P4 retires this reader.
 */
export const unavailableDiagnosticsReader: DiagnosticsReader = {
  getDiagnostics: () => Promise.reject(new DiagUnavailableError("open_failed")),
  getGlobalDiagnostics: () => Promise.reject(new DiagUnavailableError("open_failed")),
};
