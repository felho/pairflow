export type AgentRunnerBridgeStatus =
  | "settled_checkpoint"
  | "human_checkpoint"
  | "blocked";

export type AgentRunnerBridgeFailureReasonCode =
  | "AGENT_RUNNER_CONFIG_MISSING"
  | "PLAN_PATH_UNAVAILABLE"
  | "AGENT_RUNNER_SPAWN_FAILED"
  | "AGENT_RUNNER_TIMEOUT"
  | "AGENT_RUNNER_NON_ZERO_EXIT"
  | "AGENT_RUNNER_OUTPUT_INVALID";

export type AgentRunnerBridgeRunnerReasonCode = string & {
  readonly __agentRunnerBridgeRunnerReasonCode: unique symbol;
};

export type AgentRunnerBridgeReasonCode =
  | AgentRunnerBridgeFailureReasonCode
  | AgentRunnerBridgeRunnerReasonCode;

export function asAgentRunnerBridgeRunnerReasonCode(
  value: string
): AgentRunnerBridgeRunnerReasonCode {
  return value as AgentRunnerBridgeRunnerReasonCode;
}

export type AgentRunnerBridgeInputMode = "stdin_json" | "arg_json";

export interface AgentRunnerBridgeTriggerContext {
  source: string;
  reason?: string;
  observedAt?: string;
  refs?: readonly string[];
  metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredAgentRunnerOutput {
  status: AgentRunnerBridgeStatus;
  reasonCode: AgentRunnerBridgeReasonCode;
  summary?: string | undefined;
  changedArtifacts?: readonly string[] | undefined;
  routeLedgerSummary?: string | undefined;
}

export interface AgentRunnerBridgeInput {
  planPath: string;
  repoPath: string;
  invocationId: string;
  trigger: AgentRunnerBridgeTriggerContext;
  now?: Date;
  timeoutMs?: number;
}

export interface AgentRunnerCommandConfig {
  command?: string | undefined;
  args?: readonly string[] | undefined;
  cwd?: string | undefined;
  env?: Readonly<Record<string, string | undefined>> | undefined;
  timeoutMs?: number | undefined;
  inputMode?: AgentRunnerBridgeInputMode | undefined;
}

export interface RequiredAgentRunnerCommandConfig
  extends Omit<AgentRunnerCommandConfig, "command"> {
  command: string;
}

export interface AgentRunnerContinuationPayload {
  kind: "pairflow.execute_pairflow_plan.continuation";
  workflow: "ExecutePairflowPlan";
  invocation_id: string;
  plan_path: string;
  repo_path: string;
  triggered_at: string;
  trigger: AgentRunnerBridgeTriggerContext;
}

export interface AgentRunnerCommandIdentity {
  command: string;
  args: readonly string[];
  cwd: string;
  inputMode: AgentRunnerBridgeInputMode;
  timeoutMs: number;
  envKeys: readonly string[];
}

export interface AgentRunnerProcessInvocation {
  command: string;
  args: readonly string[];
  cwd: string;
  env?: Readonly<Record<string, string | undefined>> | undefined;
  stdin?: string | undefined;
  timeoutMs: number;
}

export interface AgentRunnerProcessResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut?: boolean | undefined;
}

export type RunAgentRunnerCommandPort = (
  invocation: AgentRunnerProcessInvocation
) => Promise<AgentRunnerProcessResult>;

export interface AgentRunnerBridgeDependencies {
  pathExists: (path: string) => Promise<boolean>;
  runCommand: RunAgentRunnerCommandPort;
  now?: (() => Date) | undefined;
}

export interface AgentRunnerBridgeResult {
  status: AgentRunnerBridgeStatus;
  invocationId: string;
  startedAt: string;
  completedAt: string;
  reasonCode: AgentRunnerBridgeReasonCode;
  command: AgentRunnerCommandIdentity | null;
  exitCode?: number | null | undefined;
  failureStage?:
    | "precondition"
    | "spawn"
    | "timeout"
    | "exit"
    | "output"
    | undefined;
  stdout?: string | undefined;
  stderr?: string | undefined;
  runnerSummary?: string | undefined;
  changedArtifacts?: readonly string[] | undefined;
  routeLedgerSummary?: string | undefined;
  payload?: AgentRunnerContinuationPayload | undefined;
}
