import { resolveFindingPriority, type Finding } from "../../../types/findings.js";

export interface FindingCounts {
  p0: number;
  p1: number;
  p2: number;
  p3: number;
}

export function buildFindingCounts(findings: Finding[]): FindingCounts {
  const counts: FindingCounts = {
    p0: 0,
    p1: 0,
    p2: 0,
    p3: 0
  };

  for (const finding of findings) {
    const priority = resolveFindingPriority({
      priority: finding.effective_priority ?? finding.priority,
      ...(finding.effective_priority === undefined
        ? { severity: finding.severity }
        : {})
    });
    switch (priority) {
      case "P0":
        counts.p0 += 1;
        break;
      case "P1":
        counts.p1 += 1;
        break;
      case "P2":
        counts.p2 += 1;
        break;
      case "P3":
        counts.p3 += 1;
        break;
      default:
        break;
    }
  }

  return counts;
}
