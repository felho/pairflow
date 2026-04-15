export const CREATE_REMOTE_ALIAS_INVALID = "CREATE_REMOTE_ALIAS_INVALID" as const;

export function parseCreateRemoteAlias(rawRemoteAlias: string | undefined): {
  remoteAlias?: string;
  errorMessage?: string;
} {
  if (rawRemoteAlias === undefined) {
    return {};
  }

  const normalizedRemoteAlias = rawRemoteAlias.trim();
  if (normalizedRemoteAlias.length === 0) {
    return {
      errorMessage:
        `${CREATE_REMOTE_ALIAS_INVALID}: --remote requires a non-empty alias value.`
    };
  }

  // Phase 2B CLI policy intentionally stops at trim + non-empty validation.
  // Alias-shape/pattern enforcement stays in global config authoring; create uses
  // exact lookup later and unknown aliases fail closed via BUBBLE_EXECUTOR_INVALID.
  return {
    remoteAlias: normalizedRemoteAlias
  };
}
