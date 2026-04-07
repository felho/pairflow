const metaReviewRunnerModes = ["pane_agent", "agent", "unavailable"] as const;
export type MetaReviewRunnerMode = (typeof metaReviewRunnerModes)[number];

const defaultMetaReviewRunnerTimeoutMs = 10 * 60 * 1000;

export function resolveMetaReviewRunnerMode(): MetaReviewRunnerMode {
  const configured = process.env.PAIRFLOW_META_REVIEW_RUNNER_MODE
    ?.trim()
    .toLowerCase();
  if (
    configured !== undefined &&
    (metaReviewRunnerModes as readonly string[]).includes(configured)
  ) {
    return configured as MetaReviewRunnerMode;
  }
  if (process.env.NODE_ENV === "test") {
    return "unavailable";
  }
  return "pane_agent";
}

export function resolveMetaReviewRunnerTimeoutMs(): number {
  const raw = process.env.PAIRFLOW_META_REVIEW_TIMEOUT_MS;
  if (raw === undefined) {
    return defaultMetaReviewRunnerTimeoutMs;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return defaultMetaReviewRunnerTimeoutMs;
  }
  return Math.floor(parsed);
}

export function buildMetaReviewPaneMarkers(runId: string): {
  beginMarker: string;
  endMarker: string;
} {
  return {
    beginMarker: `PAIRFLOW_META_REVIEW_JSON_BEGIN:${runId}`,
    endMarker: `PAIRFLOW_META_REVIEW_JSON_END:${runId}`
  };
}

