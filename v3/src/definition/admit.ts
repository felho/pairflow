import type { Document } from "yaml";

import type { AdmittedTemplate, WorkflowTemplate } from "../domain/index.js";
import type { GateCatalog } from "../ports/index.js";
import type { ValidationFinding } from "./errors.js";
import type { EngineChannel } from "./schema/engine.js";
import { runTemplateSurface } from "./schema/templateSurface.js";

/**
 * `admitTemplate`: THE single validation + normalization point for an
 * authored definition (ch11-C20 realized). Since ADR-019 (accepted
 * 2026-08-05) its body is not hand-written rules but ONE run of the
 * template surface's DECLARED SCHEMA — `schema/templateFormat.ts` —
 * through the engine, on whichever channel the caller is on.
 *
 * What that changed, and what it did not:
 *
 * - The FILE pipeline and the direct-construction path now share ONE
 *   computation over ONE declaration (ADR-019 D1). The hand-partitioned
 *   "realization split" that ch11-C40 and ch13-C19 each spent ratified
 *   prose defending is gone: source-bearing attributes are declared once
 *   and run where a source exists. A structurally broken value is refused
 *   on BOTH channels — the parity gate's Class 1 delta, ratified
 *   2026-08-05 (`v3/implementation/p3-parity-gate.md`).
 * - ALL-OR-NOTHING is unchanged (ch8-C22): every lane reports, suppression
 *   stays local to a broken container's dependents, and ANY finding means
 *   no admitted value exists.
 * - The finding form, the issue-code namespace, the path grammar and every
 *   message are unchanged — the parity gate measured zero path deltas and
 *   zero message deltas across 1830 executed cases.
 * - ch11-P2a A6 is unchanged and still lint-guarded: this module is the
 *   ONLY sanctioned producer of the `AdmittedTemplate` brand.
 *
 * NOT here: the admitted FORM is computed by the normalizer (ADR-019 D3),
 * and the audited residual — the runtime-context cross-rule (R3), the
 * uses-scoped source ladder (R8, boundary-kept) and the ch14 step-class
 * lanes (R7) — lives in `schema/templateSurface.ts`, wired into this same
 * finding stream.
 */
export type AdmitResult =
  | { readonly ok: true; readonly template: AdmittedTemplate }
  | { readonly ok: false; readonly findings: readonly ValidationFinding[] };

function admitOn(value: unknown, channel: EngineChannel, catalog: GateCatalog): AdmitResult {
  const outcome = runTemplateSurface(value, channel, catalog);
  if (outcome.admitted === undefined) return { ok: false, findings: outcome.findings };
  // A6: the one sanctioned mint.
  return { ok: true, template: outcome.admitted as AdmittedTemplate };
}

/** The direct-construction channel: the caller holds a value, not bytes. */
export function admitTemplate(template: WorkflowTemplate, catalog: GateCatalog): AdmitResult {
  return admitOn(template, { kind: "direct" }, catalog);
}

/**
 * The FILE channel: the resolved value graph plus its source, so the
 * source-bearing lanes (the plain-decimal integer ladder, the gates
 * subtree's key-stringness scan) have an operand. Same declaration, same
 * engine, same findings channel — the load pipeline's validate stage.
 */
export function admitFromSource(
  value: unknown,
  doc: Document,
  source: string,
  catalog: GateCatalog,
): AdmitResult {
  return admitOn(value, { kind: "file", doc, source }, catalog);
}
