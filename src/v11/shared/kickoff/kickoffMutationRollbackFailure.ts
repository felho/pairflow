function formatKickoffMutationRollbackFailure(input: {
  persistenceFailureCode: string;
  mutationError: unknown;
  rollbackErrors: string[];
}): string {
  const errorMessage =
    input.mutationError instanceof Error
      ? input.mutationError.message
      : String(input.mutationError);
  return `${input.persistenceFailureCode}: mutation failed (${errorMessage}) and rollback failed (${input.rollbackErrors.join("; ")}).`;
}

export function throwKickoffMutationRollbackFailure(input: {
  persistenceFailureCode: string;
  mutationError: unknown;
  rollbackErrors: string[];
}): never {
  // reason_code=KICKOFF_MUTATION_ROLLBACK_FAILED context=kickoff_mutation_pipeline
  throw new Error(
    formatKickoffMutationRollbackFailure({
      persistenceFailureCode: input.persistenceFailureCode,
      mutationError: input.mutationError,
      rollbackErrors: input.rollbackErrors
    })
  );
}
