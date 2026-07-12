/**
 * The definition module (ADR-011): the authored-definition surface —
 * YAML 1.2 format knowledge, the fail-at-create validator, and the
 * file-backed pinned DefinitionStore — in one home. Imports stop at
 * domain/ (types), ports/, node builtins, and the yaml dependency
 * (ADR-012); no production module imports definition/ — composition
 * roots (the CLI runtime, P2) wire it through the DefinitionStore
 * port. Public surface per packet ch8-P1 B4.
 */
export { loadTemplate } from "./load.js";
export type { LoadTemplateOptions } from "./load.js";
export { admitTemplate } from "./admit.js";
export type { AdmitResult } from "./admit.js";
export { createFileDefinitionStore } from "./fileDefinitionStore.js";
export { TemplateLoadError } from "./errors.js";
export type {
  LoadFinding,
  LoadStage,
  PipelineFinding,
  TemplateLoadErrorInfo,
  TemplateLoadResult,
  ValidationFinding,
} from "./errors.js";
