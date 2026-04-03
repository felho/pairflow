const legacyCommandRemovedReasonCode = "LEGACY_COMMAND_REMOVED";

export function isLegacyActorCommandHelpRequest(args: readonly string[]): boolean {
  return args.includes("--help") || args.includes("-h");
}

export function buildLegacyActorCommandRemovedError(input: {
  command: "pass" | "ask-human" | "converged" | "orchestra";
  canonicalCommand: string;
}): Error {
  return new Error(
    `${legacyCommandRemovedReasonCode}: \`${input.command}\` was removed in Phase 5. Use \`${input.canonicalCommand}\` instead.`
  );
}
