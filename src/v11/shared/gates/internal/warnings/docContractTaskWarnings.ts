import type { BubbleFailingGate } from "../../gateStateTypes.js";
import { isNonEmptyString } from "../../../validation/primitives.js";

function createGateWarning(input: {
  gateId: string;
  reasonCode: BubbleFailingGate["reason_code"];
  message: string;
  priority?: BubbleFailingGate["priority"] | undefined;
  timing?: BubbleFailingGate["timing"] | undefined;
  layer?: BubbleFailingGate["layer"] | undefined;
  evidenceRefs?: string[] | undefined;
  effectivePriority?: BubbleFailingGate["effective_priority"] | undefined;
}): BubbleFailingGate {
  const warning: BubbleFailingGate = {
    gate_id: input.gateId,
    reason_code: input.reasonCode,
    message: input.message,
    priority: input.priority ?? "P2",
    timing: input.timing ?? "later-hardening",
    signal_level: "warning"
  };
  if (input.layer !== undefined) {
    warning.layer = input.layer;
  }
  if (input.evidenceRefs !== undefined && input.evidenceRefs.length > 0) {
    warning.evidence_refs = input.evidenceRefs;
  }
  if (input.effectivePriority !== undefined) {
    warning.effective_priority = input.effectivePriority;
  }
  return warning;
}

function parseFrontmatter(content: string): {
  fields: Map<string, string>;
  body: string;
} | undefined {
  const lines = content.split(/\r?\n/u);
  const firstContentLineIndex = lines.findIndex((line) => line.trim().length > 0);
  if (firstContentLineIndex === -1) {
    return undefined;
  }
  if (lines[firstContentLineIndex]?.trim() !== "---") {
    return undefined;
  }
  const startIndex = firstContentLineIndex;

  const endOffset = lines.slice(startIndex + 1).findIndex((line) => line.trim() === "---");
  if (endOffset === -1) {
    return undefined;
  }
  const endIndex = startIndex + 1 + endOffset;
  const frontmatterLines = lines.slice(startIndex + 1, endIndex);
  const bodyLines = lines.slice(endIndex + 1);
  const fields = new Map<string, string>();
  for (const line of frontmatterLines) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }
    const separatorIndex = trimmed.indexOf(":");
    if (separatorIndex <= 0) {
      continue;
    }
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (key.length === 0) {
      continue;
    }
    fields.set(key, value);
  }
  return {
    fields,
    body: bodyLines.join("\n")
  };
}

function hasSectionWithContent(body: string, level: "L0" | "L1"): boolean {
  const lines = body.split(/\r?\n/u);
  const sectionMatcher = new RegExp(`^##\\s+${level}\\b`, "u");
  const anyLMatcher = /^##\s+L[0-9]\b/u;
  const startIndex = lines.findIndex((line) => sectionMatcher.test(line.trim()));
  if (startIndex === -1) {
    return false;
  }

  const contentLines: string[] = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const trimmed = lines[index]?.trim() ?? "";
    if (anyLMatcher.test(trimmed)) {
      break;
    }
    contentLines.push(trimmed);
  }

  return contentLines.some((line) => line.length > 0);
}

function hasNonEmptyFrontmatterField(
  fields: Map<string, string>,
  key: string
): boolean {
  const value = fields.get(key);
  return value !== undefined && value.trim().length > 0;
}

export function evaluateTaskContractWarnings(taskContent: string): BubbleFailingGate[] {
  const trimmed = taskContent.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const lines = taskContent.split(/\r?\n/u);
  const firstContentLineIndex = lines.findIndex((line) => line.trim().length > 0);
  const startsWithFrontmatter =
    firstContentLineIndex !== -1 && lines[firstContentLineIndex]?.trim() === "---";
  const hasContractCue = /(?:^|\n)(artifact_type|artifact_id|status|prd_ref|phase|plan_ref|system_context_ref|title|target_files|normative_refs|owners)\s*:/u
    .test(trimmed);
  const looksLikeStructuredTask = startsWithFrontmatter && hasContractCue;
  if (!looksLikeStructuredTask) {
    return [];
  }

  const parsed = parseFrontmatter(taskContent);
  if (parsed === undefined) {
    return [
      createGateWarning({
        gateId: "task_contract.minimum_presence",
        reasonCode: "DOC_CONTRACT_PARSE_WARNING",
        message:
          "Task contract frontmatter could not be parsed; Phase 1 gate remains advisory.",
        layer: "L0"
      })
    ];
  }

  const missingRequired = [
    "artifact_type",
    "artifact_id",
    "status",
    "prd_ref",
    "plan_ref",
    "system_context_ref",
    "phase"
  ].filter((key) => !hasNonEmptyFrontmatterField(parsed.fields, key));
  const missingExtension = ["title"]
    .filter((key) => !hasNonEmptyFrontmatterField(parsed.fields, key))
    .concat(
      ["target_files", "owners"].filter((key) => !parsed.fields.has(key))
    );
  const missingLevels: string[] = [];
  if (!hasSectionWithContent(parsed.body, "L0")) {
    missingLevels.push("L0");
  }
  if (!hasSectionWithContent(parsed.body, "L1")) {
    missingLevels.push("L1");
  }

  if (
    missingRequired.length === 0
    && missingExtension.length === 0
    && missingLevels.length === 0
  ) {
    return [];
  }

  const parts: string[] = [];
  if (missingRequired.length > 0) {
    parts.push(`missing required frontmatter: ${missingRequired.join(", ")}`);
  }
  if (missingExtension.length > 0) {
    parts.push(`missing phase1 extension fields: ${missingExtension.join(", ")}`);
  }
  if (missingLevels.length > 0) {
    parts.push(`missing level sections with content: ${missingLevels.join(", ")}`);
  }

  return [
    createGateWarning({
      gateId: "task_contract.minimum_presence",
      reasonCode: "DOC_CONTRACT_PARSE_WARNING",
      message: `Task contract advisory gate: ${parts.join("; ")}.`,
      layer: "L0"
    })
  ];
}

export function createDocContractConfigWarnings(input: {
  parseWarning: string | undefined;
}): BubbleFailingGate[] {
  if (!isNonEmptyString(input.parseWarning)) {
    return [];
  }

  return [
    createGateWarning({
      gateId: "config.doc_contract_gates",
      reasonCode: "GATE_CONFIG_PARSE_WARNING",
      message: input.parseWarning.trim(),
      layer: "L0"
    })
  ];
}
