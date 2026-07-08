import type { DiagnosticEventBody, DiagnosticsSink } from "../ports/diagnostics.js";

/**
 * Recording sink (packet ch7-P1): records emit-side BODIES verbatim —
 * no timestamp stamping (that is the P2 store sink's obligation,
 * CHK-C-TS-SOURCE lane). Trivially never throws, per the port's
 * fail-open contract.
 */
export interface RecordingDiagnostics {
  readonly sink: DiagnosticsSink;
  readonly events: DiagnosticEventBody[];
}

export function createRecordingDiagnosticsSink(): RecordingDiagnostics {
  const events: DiagnosticEventBody[] = [];
  return {
    events,
    sink: {
      emit: (body) => {
        events.push(body);
      },
    },
  };
}
