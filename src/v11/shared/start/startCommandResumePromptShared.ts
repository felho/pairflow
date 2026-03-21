import type { BubbleStateSnapshot } from "../../../types/bubble.js";

function formatResumeStateValue(value: string | number | null): string {
  return value === null ? "none" : String(value);
}

export function buildResumeContextLine(state: BubbleStateSnapshot): string {
  return [
    `state=${state.state}`,
    `round=${state.round}`,
    `active_agent=${formatResumeStateValue(state.active_agent)}`,
    `active_role=${formatResumeStateValue(state.active_role)}`
  ].join(", ");
}

export function appendKickoffDiagnosticLine(
  lines: string[],
  kickoffDiagnostic: string | undefined
): void {
  if ((kickoffDiagnostic?.trim().length ?? 0) > 0) {
    lines.push(`Kickoff diagnostic: ${kickoffDiagnostic}`);
  }
}

export function joinPromptLines(lines: string[]): string {
  return lines.join(" ");
}
