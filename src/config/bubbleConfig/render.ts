import {
  DEFAULT_LOCAL_OVERLAY_ENABLED,
  DEFAULT_LOCAL_OVERLAY_ENTRIES,
  DEFAULT_LOCAL_OVERLAY_MODE
} from "../defaults.js";
import type { BubbleConfig } from "../../v11/shared/config/bubbleConfigTypes.js";

function tomlString(value: string): string {
  return JSON.stringify(value);
}

function tomlStringArray(values: string[]): string {
  return `[${values.map((value) => tomlString(value)).join(", ")}]`;
}

function renderCustomCommandLines(commands: BubbleConfig["commands"]): string[] {
  const fixedCommandKeys = new Set([
    "bootstrap",
    "lint",
    "test",
    "typecheck",
    "meta_review_approve_required",
    "validation_required",
    "validation_required_explicit"
  ]);
  return Object.keys(commands)
    .filter((key) => !fixedCommandKeys.has(key))
    .sort()
    .flatMap((key) => {
      const command = commands[key];
      return typeof command === "string" && command.trim().length > 0
        ? [`${key} = ${tomlString(command)}`]
        : [];
    });
}

function normalizeTomlLines(lines: Array<string | undefined>): string[] {
  const normalized: string[] = [];
  for (const line of lines) {
    if (line === undefined) {
      continue;
    }

    if (line.length === 0) {
      if (normalized.length === 0 || normalized[normalized.length - 1] === "") {
        continue;
      }
    }

    normalized.push(line);
  }

  while (normalized.length > 0 && normalized[normalized.length - 1] === "") {
    normalized.pop();
  }

  return normalized;
}

export function renderBubbleConfigToml(config: BubbleConfig): string {
  const localOverlay = config.local_overlay ?? {
    enabled: DEFAULT_LOCAL_OVERLAY_ENABLED,
    mode: DEFAULT_LOCAL_OVERLAY_MODE,
    entries: [...DEFAULT_LOCAL_OVERLAY_ENTRIES]
  };
  const docContractGates = config.doc_contract_gates;
  const ideation = config.ideation;
  const executor = config.executor;
  const reviewPolicy = config.review_policy;
  const lines: Array<string | undefined> = [
    `id = ${tomlString(config.id)}`,
    config.bubble_instance_id
      ? `bubble_instance_id = ${tomlString(config.bubble_instance_id)}`
      : undefined,
    `repo_path = ${tomlString(config.repo_path)}`,
    `base_branch = ${tomlString(config.base_branch)}`,
    `bubble_branch = ${tomlString(config.bubble_branch)}`,
    `work_mode = ${tomlString(config.work_mode)}`,
    `quality_mode = ${tomlString(config.quality_mode)}`,
    `review_artifact_type = ${tomlString(config.review_artifact_type)}`,
    `pairflow_command_profile = ${tomlString(config.pairflow_command_profile)}`,
    `reviewer_context_mode = ${tomlString(config.reviewer_context_mode)}`,
    `watchdog_timeout_minutes = ${config.watchdog_timeout_minutes}`,
    `max_rounds = ${config.max_rounds}`,
    `severity_gate_round = ${config.severity_gate_round}`,
    `commit_requires_approval = ${config.commit_requires_approval}`,
    `accuracy_critical = ${config.accuracy_critical === true}`,
    config.attach_launcher !== undefined
      ? `attach_launcher = ${tomlString(config.attach_launcher)}`
      : '# attach_launcher unset; attach uses ~/.pairflow/config.toml, then "auto"',
    config.open_command
      ? `open_command = ${tomlString(config.open_command)}`
      : undefined,
    config.open_remote_command
      ? `open_remote_command = ${tomlString(config.open_remote_command)}`
      : undefined,
    ...(reviewPolicy !== undefined
      ? [
          "",
          "[review_policy]",
          `review_loop_mode = ${tomlString(reviewPolicy.review_loop_mode)}`,
          `reviewer_blocking_min_severity = ${tomlString(
            reviewPolicy.reviewer_blocking_min_severity
          )}`,
          `meta_review_auto_rework_min_severity = ${tomlString(
            reviewPolicy.meta_review_auto_rework_min_severity
          )}`,
          reviewPolicy.meta_review_consecutive_clean_runs_required !== undefined
            ? `meta_review_consecutive_clean_runs_required = ${reviewPolicy.meta_review_consecutive_clean_runs_required}`
            : undefined
        ]
      : []),
    ...(executor !== undefined
      ? [
          "",
          "[executor]",
          `type = ${tomlString(executor.type)}`,
          `remote = ${tomlString(executor.remote)}`
        ]
      : []),
    ...(config.validation_target !== undefined
      ? [
          "",
          "[validation_target]",
          `id = ${tomlString(config.validation_target.id)}`,
          config.validation_target.cwd !== undefined
            ? `cwd = ${tomlString(config.validation_target.cwd)}`
            : undefined,
          config.validation_target.paths !== undefined
            ? `paths = ${tomlStringArray(config.validation_target.paths)}`
            : undefined
        ]
      : []),
    "",
    "[agents]",
    `implementer = ${tomlString(config.agents.implementer)}`,
    config.agents.implementer_model !== undefined
      ? `implementer_model = ${tomlString(config.agents.implementer_model)}`
      : undefined,
    `reviewer = ${tomlString(config.agents.reviewer)}`,
    config.agents.reviewer_model !== undefined
      ? `reviewer_model = ${tomlString(config.agents.reviewer_model)}`
      : undefined,
    `meta_reviewer = ${tomlString(config.agents.meta_reviewer)}`,
    config.agents.meta_reviewer_model !== undefined
      ? `meta_reviewer_model = ${tomlString(config.agents.meta_reviewer_model)}`
      : undefined,
    "",
    "[commands]",
    config.commands.bootstrap
      ? `bootstrap = ${tomlString(config.commands.bootstrap)}`
      : undefined,
    config.commands.lint
      ? `lint = ${tomlString(config.commands.lint)}`
      : undefined,
    `test = ${tomlString(config.commands.test)}`,
    `typecheck = ${tomlString(config.commands.typecheck)}`,
    ...renderCustomCommandLines(config.commands),
    config.commands.meta_review_approve_required !== undefined
      ? `meta_review_approve_required = ${tomlStringArray(config.commands.meta_review_approve_required)}`
      : undefined,
    config.commands.validation_required !== undefined
      ? `validation_required = ${tomlStringArray(config.commands.validation_required)}`
      : undefined,
    config.commands.validation_required_explicit !== undefined
      ? `validation_required_explicit = ${config.commands.validation_required_explicit}`
      : undefined,
    "",
    "[notifications]",
    `enabled = ${config.notifications.enabled}`,
    config.notifications.waiting_human_sound
      ? `waiting_human_sound = ${tomlString(config.notifications.waiting_human_sound)}`
      : undefined,
    config.notifications.converged_sound
      ? `converged_sound = ${tomlString(config.notifications.converged_sound)}`
      : undefined,
    "",
    "[local_overlay]",
    `enabled = ${localOverlay.enabled}`,
    `mode = ${tomlString(localOverlay.mode)}`,
    `entries = ${tomlStringArray(localOverlay.entries)}`,
    "",
    "[doc_contract_gates]",
    `round_gate_applies_after = ${docContractGates.round_gate_applies_after}`,
    docContractGates.parse_warning !== undefined
      ? `parse_warning = ${tomlString(docContractGates.parse_warning)}`
      : undefined,
    ...(ideation !== undefined
      ? [
          "",
          "[ideation]",
          `mode = ${ideation.mode}`,
          `task_pending = ${ideation.task_pending}`,
          ideation.started_at !== undefined
            ? `started_at = ${tomlString(ideation.started_at)}`
            : undefined,
          ideation.kicked_off_at !== undefined
            ? `kicked_off_at = ${tomlString(ideation.kicked_off_at)}`
            : undefined,
          ideation.parse_warning !== undefined
            ? `parse_warning = ${tomlString(ideation.parse_warning)}`
            : undefined
        ]
      : [])
  ];

  return `${normalizeTomlLines(lines).join("\n")}\n`;
}
