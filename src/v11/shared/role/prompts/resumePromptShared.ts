import type { BubbleStateSnapshot } from "../../../domain/state/bubbleStateSnapshotTypes.js";

function formatResumeStateValue(value: string | number | null): string {
  return value === null ? "none" : String(value);
}

export function buildResumeContextLine(state: BubbleStateSnapshot): string {
  const parts = [
    `state=${state.state}`,
    `round=${state.round}`,
    `active_agent=${formatResumeStateValue(state.active_agent)}`,
    `active_role=${formatResumeStateValue(state.active_role)}`
  ];
  const executionContext = state.execution_context;
  if (executionContext !== null && executionContext !== undefined) {
    parts.push(
      `execution_context.handoff_id=${executionContext.handoff_id}`,
      `execution_context.awaited_output_type=${executionContext.awaited_output_type}`,
      `execution_context.attempt=${executionContext.attempt}`
    );
  }
  return parts.join(", ");
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
