/**
 * The gates module (ADR-013, `accepted`): the builtin inline evaluators
 * + the static registry. Imports stop at domain/ + ports/ + stdlib
 * (lint-enforced BOTH directions, G1); no production module except the
 * CLI composition roots imports gates/. The catalog is wired at the
 * composition roots into the `DefinitionStore` construction.
 */
export { createGateRegistry } from "./registry.js";
export { thresholdRegistration } from "./threshold.js";
export { previousReviewerVerdictRegistration } from "./previousReviewerVerdict.js";
export { processRegistration } from "./process.js";
