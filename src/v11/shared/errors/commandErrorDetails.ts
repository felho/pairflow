interface NormalizedPairflowCommandErrorDetails {
  message: string;
  reasonCode?: string;
  context?: PairflowCommandErrorContext;
  cause?: unknown;
}

const reasonCodePrefixPattern = /^([A-Z][A-Z0-9_]{2,}):\s/u;
const contextJsonPattern = /\scontext=(\{.+\})\s*$/u;
const contextTextPattern = /\scontext:\s(.+?)\.?\s*$/u;
const contextTokenPattern = /([a-zA-Z_][a-zA-Z0-9_]*)=([^;\s]+)/gu;

function parseContextJsonFromMessage(
  message: string
): PairflowCommandErrorContext | undefined {
  const match = message.match(contextJsonPattern);
  if (match === null) {
    return undefined;
  }
  const serializedContext = match[1];
  if (serializedContext === undefined) {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(serializedContext);
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as PairflowCommandErrorContext;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function parseContextTextFromMessage(
  message: string
): PairflowCommandErrorContext | undefined {
  const match = message.match(contextTextPattern);
  if (match === null) {
    return undefined;
  }
  const contextText = match[1];
  if (contextText === undefined) {
    return undefined;
  }

  const parsed: PairflowCommandErrorContext = {};
  for (const token of contextText.matchAll(contextTokenPattern)) {
    const key = token[1];
    const value = token[2];
    if (key === undefined || value === undefined) {
      continue;
    }
    parsed[key] = value;
  }
  return Object.keys(parsed).length > 0 ? parsed : undefined;
}

export function formatPairflowCommandErrorMessage(
  input: PairflowCommandErrorDetails
): string {
  const reasonPrefix =
    input.reasonCode !== undefined ? `${input.reasonCode}: ` : "";
  const contextSuffix =
    input.context !== undefined
      ? ` context=${JSON.stringify(input.context)}`
      : "";
  return `${reasonPrefix}${input.message}${contextSuffix}`;
}

export function normalizePairflowCommandErrorInput(
  input: PairflowCommandErrorInput
): NormalizedPairflowCommandErrorDetails {
  if (typeof input === "string") {
    const reasonCodeMatch = input.match(reasonCodePrefixPattern);
    const parsedContext =
      parseContextJsonFromMessage(input) ?? parseContextTextFromMessage(input);
    const reasonCode = reasonCodeMatch?.[1];
    return {
      message: input,
      ...(reasonCode !== undefined
        ? { reasonCode }
        : {}),
      ...(parsedContext !== undefined
        ? { context: parsedContext }
        : {})
    };
  }

  return {
    message: formatPairflowCommandErrorMessage(input),
    ...(input.reasonCode !== undefined
      ? { reasonCode: input.reasonCode }
      : {}),
    ...(input.context !== undefined
      ? { context: input.context }
      : {}),
    ...(input.cause !== undefined
      ? { cause: input.cause }
      : {})
  };
}
