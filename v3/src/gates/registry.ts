import type { GateCatalog, GateRegistration } from "../ports/index.js";
import { previousReviewerVerdictRegistration } from "./previousReviewerVerdict.js";
import { processRegistration } from "./process.js";
import { thresholdRegistration } from "./threshold.js";

/**
 * `createGateRegistry` (packet ch11-P2a G2, extended ch11-P3a G1): the
 * static Block A composition. As of P3a it ships EXACTLY the C8/C9
 * chapter-end three-member set — `declarative.threshold`,
 * `pairflow.previous_reviewer_verdict`, and `external.process`. The catalog
 * is COMPOSITION, not a mutable lookup (note 5) — no registration/mutation
 * API; tests compose their OWN catalogs (including hostile ones) rather than
 * mutating the shipped one.
 */
export function createGateRegistry(): GateCatalog {
  const registrations = new Map<string, GateRegistration>([
    ["declarative.threshold", thresholdRegistration],
    ["pairflow.previous_reviewer_verdict", previousReviewerVerdictRegistration],
    ["external.process", processRegistration],
  ]);
  return {
    resolve(uses: string): GateRegistration | null {
      return registrations.get(uses) ?? null;
    },
  };
}
