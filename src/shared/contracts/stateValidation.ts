import type { ValidationError } from "../../v11/shared/validation/primitives.js";

export interface StateValidationDiagnostics {
  message: string;
  errors: ValidationError[];
}
