import { parseDocument } from "yaml";
import type { YAMLError } from "yaml";

import type { PipelineFinding, TemplateLoadResult, ValidationFinding } from "./errors.js";
import { validateTemplate } from "./validate.js";

/**
 * Packet ch8-P1 (G1/draft C36): the staged load pipeline over raw
 * bytes — read (strict UTF-8 decode) → parse (the document step AND
 * the directive check) → resolve (`toJS`, where the alias-amplification
 * guard fires) → validate. Each stage SHORT-CIRCUITS: the first
 * failing stage's finding(s) are the entire result; every stage's
 * unexpected throw is caught and mapped (no load input produces an
 * uncaught throw — E3/draft C22 binds every stage). The OS half of
 * the read stage belongs to the CALLER that reads files (the store;
 * P2's dev validate) — `opts.path` stamps read-stage findings per
 * E5's presence scoping.
 */
export interface LoadTemplateOptions {
  readonly path?: string;
}

function fail(stage: "read" | "parse" | "resolve", findings: readonly PipelineFinding[]): TemplateLoadResult;
function fail(stage: "validate", findings: readonly ValidationFinding[]): TemplateLoadResult;
function fail(
  stage: "read" | "parse" | "resolve" | "validate",
  findings: readonly PipelineFinding[] | readonly ValidationFinding[],
): TemplateLoadResult {
  return { ok: false, error: { stage, findings } };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** E1 (draft C20): positional parse findings — 1-based line/col where the parser provides them. */
function parseFinding(error: YAMLError): PipelineFinding {
  const pos = error.linePos?.[0];
  return {
    stage: "parse",
    ...(pos ? { line: pos.line, col: pos.col } : {}),
    message: error.message,
  };
}

export function loadTemplate(bytes: Uint8Array, opts: LoadTemplateOptions = {}): TemplateLoadResult {
  // READ stage, decode half (G3/draft C6): strict UTF-8 — invalid bytes
  // reject with a content-free message, never the silent U+FFFD repair.
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return fail("read", [
      {
        stage: "read",
        ...(opts.path !== undefined ? { path: opts.path } : {}),
        message: "invalid UTF-8 byte sequence (templates are strict UTF-8)",
      },
    ]);
  }

  // PARSE stage (G4–G7/draft C2–C4, C34): the document API with BOTH
  // errors AND warnings promoted (fail-closed), plus the directive
  // check — its synthesized finding HEADS the ordered list.
  let doc: ReturnType<typeof parseDocument>;
  try {
    doc = parseDocument(text);
  } catch (error) {
    // Defensive: probes P9/P13 show content diagnostics collect in
    // doc.errors — the stage catch is the C22 every-stage belt.
    return fail("parse", [{ stage: "parse", message: errorMessage(error) }]);
  }
  const parseFindings: PipelineFinding[] = [];
  const yamlDirective = doc.directives?.yaml;
  if (yamlDirective?.explicit === true && yamlDirective.version !== "1.2") {
    // The silently-ADOPTED case (probe P17: %YAML 1.1 — zero errors,
    // zero warnings, the full 1.1 trap restored). Synthesized: the
    // parser emitted nothing, so no position fields exist.
    parseFindings.push({
      stage: "parse",
      message: `%YAML ${yamlDirective.version} directive: only YAML 1.2 is supported`,
    });
  }
  for (const error of doc.errors) {
    parseFindings.push(parseFinding(error));
  }
  for (const warning of doc.warnings) {
    parseFindings.push(parseFinding(warning));
  }
  if (parseFindings.length > 0) {
    return fail("parse", parseFindings);
  }

  // RESOLVE stage (G8/draft C5+C36): toJS — the alias-amplification
  // guard throws HERE, invisible to doc.errors (probes P8/P14/P16).
  let value: unknown;
  try {
    value = doc.toJS();
  } catch (error) {
    return fail("resolve", [{ stage: "resolve", message: errorMessage(error) }]);
  }

  // VALIDATE stage (E2 + the V lanes; cycle-safe per V15).
  try {
    const outcome = validateTemplate(value, doc, text);
    if (outcome.findings.length > 0 || outcome.template === undefined) {
      return fail("validate", outcome.findings);
    }
    return { ok: true, template: outcome.template };
  } catch (error) {
    // The C22 every-stage belt: no known input reaches this (V15's
    // cycle rule is a FINDING, not a throw), but the stage still maps.
    return fail("validate", [{ path: "$", message: `internal validator failure: ${errorMessage(error)}` }]);
  }
}
