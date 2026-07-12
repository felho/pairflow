import type { AdmittedTemplate } from "../domain/index.js";

/**
 * Packet ch8-P1 (E5): the typed load-error machine shape — the
 * `{stage, findings}` form the P2 CLI error doc surfaces verbatim.
 * Load findings are LOAD-side typed errors: no 85-registry rejection
 * name exists or is mimicked here (E4 / draft C23).
 */
export type LoadStage = "read" | "parse" | "resolve" | "validate" | "store";

/**
 * The E1 (draft C20) positional form — read/parse/resolve stages.
 * `path` presence per E5's scoping: always from file-reading callers,
 * iff supplied on the bare bytes-level entry. `code` is the OS errno
 * on the read stage's OS half only. `line`/`col` are 1-based, present
 * where the parser provides them.
 */
export interface PipelineFinding {
  readonly stage: "read" | "parse" | "resolve";
  readonly path?: string;
  readonly code?: string;
  readonly line?: number;
  readonly col?: number;
  readonly message: string;
}

/**
 * The E2 (draft C21) accumulated form — validate stage, plus the
 * store's post-validate ref-check (S2: one entry at path "ref").
 * Paths are dotted; the root is the token "$".
 *
 * `code` (packet ch11-P2a, A9) is the C21 named-lane carrier: present on
 * exactly the NAMED admission lanes (`gate_evaluator_unavailable` in
 * this packet; the P3/P4 codes join with their lanes), ABSENT on every
 * ch8 structural lane and every uncoded gate-config lane. An additive
 * optional field — the CLI's `{stage, findings}` machine shape is
 * unchanged in kind (C28).
 */
export interface ValidationFinding {
  readonly path: string;
  readonly message: string;
  readonly code?: string;
}

export type LoadFinding = PipelineFinding | ValidationFinding;

export interface TemplateLoadErrorInfo {
  readonly stage: LoadStage;
  readonly findings: readonly LoadFinding[];
}

/**
 * The store's rejection carrier (S3/C28): a code identifier, not a
 * doc name — the CLI doc name `TemplateInvalid` is P2's (draft C31).
 */
export class TemplateLoadError extends Error {
  readonly stage: LoadStage;
  readonly findings: readonly LoadFinding[];

  constructor(info: TemplateLoadErrorInfo) {
    super(`template load failed at the ${info.stage} stage (${String(info.findings.length)} finding(s))`);
    this.name = "TemplateLoadError";
    this.stage = info.stage;
    this.findings = info.findings;
  }

  /**
   * The E5 machine shape holds on the SERIALIZATION surface too
   * (aftermath fix, the external arm's catch: the enumerable `name`
   * own-property leaked into JSON.stringify output). P2's CLI builds
   * its doc from the fields either way; this makes the naive path
   * emit exactly `{stage, findings}`.
   */
  toJSON(): TemplateLoadErrorInfo {
    return { stage: this.stage, findings: this.findings };
  }
}

/**
 * E3 (draft C22): a template XOR an error result — nothing partial. The
 * `ok` arm carries the ADMITTED form (ch11-P2a, A1/A6): `loadTemplate`
 * runs `admitTemplate` as the validate stage's second rung, so a
 * successful load has passed admission and the store yields the branded
 * type without a second assertion.
 */
export type TemplateLoadResult =
  | { readonly ok: true; readonly template: AdmittedTemplate }
  | { readonly ok: false; readonly error: TemplateLoadErrorInfo };
