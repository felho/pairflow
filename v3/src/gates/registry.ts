import type { GateCatalog, GateRegistration } from "../ports/index.js";
import { previousReviewerVerdictRegistration } from "./previousReviewerVerdict.js";
import { processRegistration } from "./process.js";
import { thresholdRegistration } from "./threshold.js";

/**
 * `REGISTRY_IDS` (packet ch11-P3a, G1): the EXACT chapter-end three-member
 * id set as a frozen tuple — the SINGLE SOURCE the composed catalog is built
 * from (`createGateRegistry` maps each id to its registration through
 * `REGISTRATION_BY_ID`, never a parallel literal). Exported so `registry.test.ts`
 * measures membership enumerably: exact-set equality with the C8 members, every
 * member resolving, and `length === 3` — an undeclared fourth registration turns
 * those red. The catalog stays composition, no mutation API (note 5).
 */
export const REGISTRY_IDS = Object.freeze([
  "declarative.threshold",
  "pairflow.previous_reviewer_verdict",
  "external.process",
] as const);

/** Each `REGISTRY_IDS` member's registration — keyed by the SAME id union, so a
 * registration without a declared id (or an id without a registration) fails to
 * type-check rather than shipping an undeclared member. */
const REGISTRATION_BY_ID: Record<(typeof REGISTRY_IDS)[number], GateRegistration> = {
  "declarative.threshold": thresholdRegistration,
  "pairflow.previous_reviewer_verdict": previousReviewerVerdictRegistration,
  "external.process": processRegistration,
};

/**
 * `createGateRegistry` (packet ch11-P2a G2, extended ch11-P3a G1): the
 * static Block A composition. As of P3a it ships EXACTLY the C8/C9
 * chapter-end three-member set, built FROM `REGISTRY_IDS` (the single source)
 * — `declarative.threshold`, `pairflow.previous_reviewer_verdict`, and
 * `external.process`. The catalog is COMPOSITION, not a mutable lookup
 * (note 5) — no registration/mutation API; tests compose their OWN catalogs
 * (including hostile ones) rather than mutating the shipped one.
 */
export function createGateRegistry(): GateCatalog {
  const registrations = new Map<string, GateRegistration>(
    REGISTRY_IDS.map((id) => [id, REGISTRATION_BY_ID[id]]),
  );
  return {
    resolve(uses: string): GateRegistration | null {
      return registrations.get(uses) ?? null;
    },
  };
}
