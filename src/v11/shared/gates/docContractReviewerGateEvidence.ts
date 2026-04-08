import type { Finding } from "../../../types/findings.js";
import { isNonEmptyString } from "../validation/primitives.js";

export function normalizeEvidenceRefs(finding: Finding): string[] {
  const refs: string[] = [];
  if (Array.isArray(finding.refs)) {
    for (const ref of finding.refs) {
      if (isNonEmptyString(ref)) {
        refs.push(ref.trim());
      }
    }
  }

  const evidence = finding.evidence;
  if (isNonEmptyString(evidence)) {
    refs.push(evidence.trim());
  } else if (Array.isArray(evidence)) {
    for (const value of evidence) {
      if (isNonEmptyString(value)) {
        refs.push(value.trim());
      }
    }
  }
  return refs;
}
