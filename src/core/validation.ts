// Temporary bridge to the v11 canonical validation owner.
export type {
  ValidationError,
  ValidationFail,
  ValidationOk,
  ValidationResult
} from "../v11/shared/validation/primitives.js";
export {
  SchemaValidationError,
  assertValidation,
  isInteger,
  isIsoTimestamp,
  isNonEmptyString,
  isRecord,
  validationFail,
  validationOk
} from "../v11/shared/validation/primitives.js";
