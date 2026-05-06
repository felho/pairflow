export const META_REVIEW_APPROVE_VALIDATION_FAILED =
  "META_REVIEW_APPROVE_VALIDATION_FAILED" as const;

export function buildApproveValidationFailureReason(input: {
  stage: "resolve" | "exec" | "spawn" | "log";
  commandId: string;
  exitCode: number | null;
  logPath: string | null;
  detail: string;
}): string {
  return [
    `${META_REVIEW_APPROVE_VALIDATION_FAILED}: approve-gate validation failed`,
    `stage=${input.stage}`,
    `commandId=${input.commandId}`,
    `exitCode=${input.exitCode === null ? "null" : input.exitCode}`,
    `logPath=${input.logPath === null ? "null" : input.logPath}`,
    `detail=${input.detail}`
  ].join("; ");
}

type RunnerErrorStage =
  | "pre_header"
  | "spawn"
  | "settle"
  | "stdout"
  | "stderr";

function isRunnerErrorStage(stage: unknown): stage is RunnerErrorStage {
  return (
    stage === "pre_header" ||
    stage === "spawn" ||
    stage === "settle" ||
    stage === "stdout" ||
    stage === "stderr"
  );
}

function assertNeverRunnerStage(stage: never): never {
  void stage;
  // reason_code=META_REVIEW_APPROVE_VALIDATION_RUNNER_STAGE_UNHANDLED context=approve_validation_runner_stage_mapping
  throw new Error(
    "META_REVIEW_APPROVE_VALIDATION_RUNNER_STAGE_UNHANDLED: unhandled approve validation runner stage."
  );
}

function mapKnownRunnerErrorStage(stage: RunnerErrorStage): "spawn" | "log" | "exec" {
  switch (stage) {
    case "pre_header":
    case "stdout":
    case "stderr":
      return "log";
    case "settle":
      return "exec";
    case "spawn":
      return "spawn";
    default:
      return assertNeverRunnerStage(stage);
  }
}

function mapRunnerErrorStage(stage: unknown): "spawn" | "log" | "exec" {
  if (isRunnerErrorStage(stage)) {
    return mapKnownRunnerErrorStage(stage);
  }
  return "spawn";
}

function describeRunnerErrorStage(stage: unknown): string {
  return typeof stage === "string" ? stage : "unknown";
}

export function buildApproveValidationRunnerFailureReason(input: {
  commandId: string;
  error: unknown;
}): string {
  const maybeRunnerError = input.error as { stage?: unknown; logPath?: unknown };
  return buildApproveValidationFailureReason({
    stage: mapRunnerErrorStage(maybeRunnerError.stage),
    commandId: input.commandId,
    exitCode: null,
    logPath:
      maybeRunnerError.stage === "pre_header"
        ? null
        : typeof maybeRunnerError.logPath === "string"
          ? maybeRunnerError.logPath
          : null,
    detail:
      `runnerStage=${describeRunnerErrorStage(maybeRunnerError.stage)}; ` +
      (input.error instanceof Error ? input.error.message : String(input.error))
  });
}
