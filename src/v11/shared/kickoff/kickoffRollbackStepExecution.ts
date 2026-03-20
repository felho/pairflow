function appendKickoffRollbackError(input: {
  rollbackErrors: string[];
  target: string;
  rollbackError: unknown;
}): void {
  input.rollbackErrors.push(
    `${input.target} rollback failed: ${input.rollbackError instanceof Error ? input.rollbackError.message : String(input.rollbackError)}`
  );
}

export async function executeKickoffRollbackStep(input: {
  rollbackErrors: string[];
  target: string;
  run: () => Promise<unknown>;
}): Promise<void> {
  await input.run().catch((rollbackError) => {
    appendKickoffRollbackError({
      rollbackErrors: input.rollbackErrors,
      target: input.target,
      rollbackError
    });
  });
}
