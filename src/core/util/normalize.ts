export function normalizeStringList(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];
}

export function requireNonEmptyString<TError extends Error>(
  value: string,
  fieldName: string,
  errorFactory: (message: string) => TError
): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw errorFactory(`${fieldName} cannot be empty.`);
  }

  return normalized;
}
