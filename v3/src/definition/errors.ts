import type { WorkflowTemplate } from "../domain/index.js";

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
 */
export interface ValidationFinding {
  readonly path: string;
  readonly message: string;
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
}

/** E3 (draft C22): a template XOR an error result — nothing partial. */
export type TemplateLoadResult =
  | { readonly ok: true; readonly template: WorkflowTemplate }
  | { readonly ok: false; readonly error: TemplateLoadErrorInfo };
