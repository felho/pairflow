export interface BuildKickoffResultBaseInput<TMarkers> {
  bubbleId: string;
  taskEnvelopeAppended: boolean;
  markersBefore: TMarkers;
  markersAfter: TMarkers;
}

export interface KickoffResultBaseShape<TMarkers> {
  bubble_id: string;
  protocol: {
    task_envelope_appended: boolean;
  };
  markers_before: TMarkers;
  markers_after: TMarkers;
}

export function buildKickoffResultBase<TMarkers>(
  input: BuildKickoffResultBaseInput<TMarkers>
): KickoffResultBaseShape<TMarkers> {
  return {
    bubble_id: input.bubbleId,
    protocol: {
      task_envelope_appended: input.taskEnvelopeAppended
    },
    markers_before: input.markersBefore,
    markers_after: input.markersAfter
  };
}
