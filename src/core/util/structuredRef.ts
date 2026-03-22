export function isLikelyStructuredRef(value: string): boolean {
  return value.includes("/");
}
