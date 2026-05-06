export function isApproveValidationCommandFailure(
  fallbackReason: string
): boolean {
  return (
    fallbackReason.includes("stage=exec") &&
    fallbackReason.includes("detail=command exited ")
  );
}

export function buildApproveValidationReworkMessage(
  fallbackReason: string
): string {
  return [
    "Meta-review approved the current change, but the required approve-gate validation failed.",
    "",
    "Please inspect the validation failure and try to fix it in this bubble worktree. Treat the failure as actionable for this bubble unless the correct fix is genuinely unclear.",
    "",
    `Validation failure: ${fallbackReason}`,
    "",
    "If the failure points to an ambiguous repository state or you cannot determine the appropriate fix after inspecting the log, ask the human for direction instead of routing around the failure."
  ].join("\n");
}
