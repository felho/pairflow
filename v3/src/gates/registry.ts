import type { GateCatalog, GateRegistration } from "../ports/index.js";
import { previousReviewerVerdictRegistration } from "./previousReviewerVerdict.js";
import { thresholdRegistration } from "./threshold.js";

/**
 * `createGateRegistry` (packet ch11-P2a, G2): the static Block A
 * composition. THIS packet ships exactly `declarative.threshold` +
 * `pairflow.previous_reviewer_verdict`; `external.process` JOINS at P3
 * (plan §11.4 P3 row). The catalog is COMPOSITION, not a mutable lookup
 * (note 5) — no registration/mutation API; tests compose their OWN
 * catalogs (including hostile ones) rather than mutating the shipped
 * one.
 */
export function createGateRegistry(): GateCatalog {
  const registrations = new Map<string, GateRegistration>([
    ["declarative.threshold", thresholdRegistration],
    ["pairflow.previous_reviewer_verdict", previousReviewerVerdictRegistration],
  ]);
  return {
    resolve(uses: string): GateRegistration | null {
      return registrations.get(uses) ?? null;
    },
  };
}
