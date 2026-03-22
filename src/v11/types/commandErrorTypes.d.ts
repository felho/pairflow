type PairflowCommandErrorContext = Record<string, unknown>;

interface PairflowCommandErrorDetails {
  message: string;
  reasonCode?: string;
  context?: PairflowCommandErrorContext;
  cause?: unknown;
}

type PairflowCommandErrorInput = string | PairflowCommandErrorDetails;
