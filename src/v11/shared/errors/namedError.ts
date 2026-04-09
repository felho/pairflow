export function isNamedError(
  candidate: unknown,
  expectedName: string
): candidate is Error {
  return candidate instanceof Error && candidate.name === expectedName;
}
