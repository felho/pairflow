export interface ContractValidationError {
  path: string;
  message: string;
}

export interface StateValidationDiagnostics {
  message: string;
  errors: ContractValidationError[];
}
