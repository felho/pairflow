export type GatePipelineOutcome = "pass" | "warn" | "block";

export interface GateEvaluatorResult<TMetadata = unknown> {
  gate_id: string;
  outcome: GatePipelineOutcome;
  diagnostics?: string[];
  metadata?: TMetadata;
}

export interface GateEvaluatorInput<TContext, TProfile extends string> {
  context: TContext;
  profile: TProfile;
}

export interface GateEvaluator<TContext, TProfile extends string, TMetadata = unknown> {
  gate_id: string;
  evaluate: (
    input: GateEvaluatorInput<TContext, TProfile>
  ) => Promise<GateEvaluatorResult<TMetadata>>;
}

export interface GatePipelineInput<TContext, TProfile extends string, TMetadata = unknown> {
  gates: Array<GateEvaluator<TContext, TProfile, TMetadata>>;
  context: TContext;
  profile: TProfile;
  skip_list?: string[];
  diagnostics_seed?: string[];
}

export type GatePipelineGateOutcome<TMetadata = unknown> =
  GateEvaluatorResult<TMetadata>;

export interface GatePipelineResult<TMetadata = unknown> {
  final_outcome: GatePipelineOutcome;
  gate_outcomes: Array<GatePipelineGateOutcome<TMetadata>>;
  diagnostics: string[];
  stopped_at_gate_id?: string;
  skipped_gate_ids?: string[];
}
