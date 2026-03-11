import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  createDocContractGateArtifact,
  evaluateTaskContractWarnings,
  evaluateReviewerGateWarnings,
  readDocContractGateArtifact,
  resolveDocContractGateArtifactPath
} from "../../../src/core/gates/docContractGates.js";
import type { BubbleConfig } from "../../../src/types/bubble.js";
import type { Finding } from "../../../src/types/findings.js";

const tempDirs: string[] = [];

function createBubbleConfig(): BubbleConfig {
  return {
    id: "b_gates_01",
    repo_path: "/tmp/repo",
    base_branch: "main",
    bubble_branch: "bubble/b_gates_01",
    work_mode: "worktree",
    quality_mode: "strict",
    review_artifact_type: "auto",
    pairflow_command_profile: "external",
    reviewer_context_mode: "fresh",
    watchdog_timeout_minutes: 20,
    max_rounds: 8,
    severity_gate_round: 4,
    commit_requires_approval: true,
    accuracy_critical: false,
    agents: {
      implementer: "codex",
      reviewer: "claude"
    },
    commands: {
      test: "pnpm test",
      typecheck: "pnpm typecheck"
    },
    notifications: {
      enabled: true
    },
    enforcement_mode: {
      all_gate: "advisory",
      docs_gate: "advisory"
    },
    doc_contract_gates: {
      round_gate_applies_after: 2
    }
  };
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))
  );
});

describe("docContractGates", () => {
  it("does not emit task contract warnings for a structured task that satisfies Phase 1 fields", () => {
    const warnings = evaluateTaskContractWarnings(`---
artifact_type: task
artifact_id: task_example
status: draft
phase: phase1
prd_ref: null
plan_ref: plans/tasks/example.md
system_context_ref: docs/pairflow-initial-design.md
title: Example task
target_files:
  - src/example.ts
normative_refs:
  - docs/llm-doc-workflow-v1.md
owners:
  - felho
---

## L0 - Policy
Structured task with complete frontmatter.

## L1 - Change Contract
At least one concrete behavior statement.
`);

    expect(warnings).toEqual([]);
  });

  it("does not treat generic markdown horizontal rules as structured task contract input", () => {
    const warnings = evaluateTaskContractWarnings(`
# Notes

Paragraph before separator.

---

Paragraph after separator.
`);

    expect(warnings).toEqual([]);
  });

  it("does not emit parse warning for plain content that starts with --- without contract cues", () => {
    const warnings = evaluateTaskContractWarnings(`---
Plain text paragraph starting after a separator.
No frontmatter contract keys are declared here.
`);

    expect(warnings).toEqual([]);
  });

  it("does not treat frontmatter delimiters below a prose preface as task contract input", () => {
    const warnings = evaluateTaskContractWarnings(`Preface line before any contract.
---
artifact_type: task
artifact_id: task_preface
status: draft
phase: phase1
---

## L0
preface
`);

    expect(warnings).toEqual([]);
  });

  it("emits parse warning when frontmatter starts with prd_ref cue but is malformed", () => {
    const warnings = evaluateTaskContractWarnings(`---
prd_ref: docs/prd.md
artifact_type: task
missing_closing_delimiter: true
`);

    expect(warnings).toEqual([
      expect.objectContaining({
        reason_code: "DOC_CONTRACT_PARSE_WARNING"
      })
    ]);
  });

  it("treats empty required scalar frontmatter values as missing", () => {
    const warnings = evaluateTaskContractWarnings(`---
artifact_type: task
artifact_id: task_empty_required_value
status:
phase: phase1
prd_ref: null
plan_ref: plans/tasks/example.md
system_context_ref: docs/pairflow-initial-design.md
title: Example task
target_files:
  - src/example.ts
normative_refs:
  - docs/llm-doc-workflow-v1.md
owners:
  - felho
---

## L0 - Policy
Structured task with empty required scalar value.

## L1 - Change Contract
At least one concrete behavior statement.
`);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.reason_code).toBe("DOC_CONTRACT_PARSE_WARNING");
    expect(warnings[0]?.message).toContain("missing required frontmatter: status");
  });

  it("initializes round gate state with round=1 for new artifacts", () => {
    const artifact = createDocContractGateArtifact({
      now: new Date("2026-03-05T12:30:00.000Z"),
      bubbleConfig: createBubbleConfig(),
      taskContent: "Simple task"
    });

    expect(artifact.round_gate_state.round).toBe(1);
    expect(artifact.round_gate_state.applies).toBe(false);
  });

  it("emits REVIEW_SCHEMA_WARNING when required finding fields are missing", () => {
    const findings: Finding[] = [
      {
        priority: "P2",
        title: "Schema fields missing"
      }
    ];

    const result = evaluateReviewerGateWarnings({
      round: 1,
      findings,
      roundGateAppliesAfter: 2
    });

    expect(result.warnings.some((entry) => entry.reason_code === "REVIEW_SCHEMA_WARNING")).toBe(true);
  });

  it("emits both schema and blocker-evidence warnings for blocker findings with missing timing/layer/evidence", () => {
    const findings: Finding[] = [
      {
        priority: "P1",
        title: "Blocker declaration missing required fields"
      }
    ];

    const result = evaluateReviewerGateWarnings({
      round: 1,
      findings,
      roundGateAppliesAfter: 2
    });

    const schemaWarning = result.warnings.find(
      (entry) => entry.reason_code === "REVIEW_SCHEMA_WARNING"
    );
    expect(schemaWarning?.message).toContain("timing");
    expect(schemaWarning?.message).toContain("layer");
    expect(schemaWarning?.message).not.toContain("evidence");
    expect(result.warnings.some((entry) => entry.reason_code === "BLOCKER_EVIDENCE_WARNING")).toBe(true);
  });

  it("does not emit missing timing/layer schema warning for shorthand-compatible defaults", () => {
    const findings: Finding[] = [
      {
        priority: "P2",
        severity: "P2",
        timing: "later-hardening",
        layer: "L1",
        refs: ["docs/reviewer-severity-ontology.md#runtime-pass-evidence-binding"],
        title: "CLI shorthand compatibility defaults"
      }
    ];

    const result = evaluateReviewerGateWarnings({
      round: 1,
      findings,
      roundGateAppliesAfter: 2
    });

    expect(result.warnings).toEqual([]);
    expect(result.normalizedFindings[0]).toEqual(findings[0]);
    expect(result.findingEvaluations[0]).toMatchObject({
      priority: "P2",
      effective_priority: "P2",
      timing: "later-hardening",
      effective_timing: "later-hardening",
      layer: "L1"
    });
  });

  it("keeps other schema warnings when shorthand-compatible defaults are valid", () => {
    const result = evaluateReviewerGateWarnings({
      round: 1,
      findings: [
        {
          priority: "P2",
          severity: "P2",
          timing: "later-hardening",
          layer: "L1",
          title: "Compatibility defaults do not mask missing evidence"
        }
      ],
      roundGateAppliesAfter: 2
    });

    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]?.reason_code).toBe("REVIEW_SCHEMA_WARNING");
    expect(result.warnings[0]?.message).toContain("evidence");
    expect(result.warnings[0]?.message).not.toContain("timing");
    expect(result.warnings[0]?.message).not.toContain("layer");
  });

  it("downgrades blocker without evidence and keeps input finding immutable", () => {
    const inputFinding: Finding = {
      priority: "P1",
      timing: "required-now",
      layer: "L1",
      title: "Potential blocker without evidence"
    };

    const result = evaluateReviewerGateWarnings({
      round: 1,
      findings: [inputFinding],
      roundGateAppliesAfter: 2
    });

    expect(result.findingEvaluations[0]?.priority).toBe("P1");
    expect(result.findingEvaluations[0]?.effective_priority).toBe("P2");
    expect(result.warnings.some((entry) => entry.reason_code === "BLOCKER_EVIDENCE_WARNING")).toBe(true);
    expect(inputFinding).not.toHaveProperty("effective_priority");
  });

  it("treats required-now P0/P1 findings without L1 layer as auditable non-blockers", () => {
    const result = evaluateReviewerGateWarnings({
      round: 1,
      findings: [
        {
          priority: "P1",
          timing: "required-now",
          evidence: "docs/spec.md:12",
          title: "Declared blocker without explicit L1 layer"
        }
      ],
      roundGateAppliesAfter: 2
    });

    expect(result.findingEvaluations[0]?.priority).toBe("P1");
    expect(result.findingEvaluations[0]?.effective_priority).toBe("P2");
    expect(result.specLockState).toEqual({
      state: "IMPLEMENTABLE",
      open_blocker_count: 0,
      open_required_now_count: 1
    });
    const layerWarning = result.warnings.find(
      (entry) =>
        entry.reason_code === "REVIEW_SCHEMA_WARNING"
        && entry.effective_priority === "P2"
    );
    expect(layerWarning).toBeDefined();
  });

  it("auto-demotes non-blocker required-now findings after round gate threshold", () => {
    const result = evaluateReviewerGateWarnings({
      round: 3,
      roundGateAppliesAfter: 2,
      findings: [
        {
          priority: "P2",
          timing: "required-now",
          layer: "L1",
          evidence: "src/example.ts:10",
          title: "Non-blocker required-now after round two"
        }
      ]
    });

    expect(result.findingEvaluations[0]?.priority).toBe("P2");
    expect(result.findingEvaluations[0]?.effective_timing).toBe("later-hardening");
    expect(result.roundGateState.violated).toBe(true);
    expect(result.warnings.some((entry) => entry.reason_code === "ROUND_GATE_AUTODEMOTE")).toBe(true);
    expect(result.warnings.some((entry) => entry.reason_code === "ROUND_GATE_WARNING")).toBe(true);
    const roundWarning = result.warnings.find(
      (entry) => entry.reason_code === "ROUND_GATE_WARNING"
    );
    expect(roundWarning).toMatchObject({
      priority: "P2",
      timing: "later-hardening"
    });
  });

  it("keeps round gate applies=true but violated=false when no findings exist after threshold", () => {
    const result = evaluateReviewerGateWarnings({
      round: 3,
      roundGateAppliesAfter: 2,
      findings: []
    });

    expect(result.warnings).toEqual([]);
    expect(result.findingEvaluations).toEqual([]);
    expect(result.roundGateState).toEqual({
      applies: true,
      violated: false,
      round: 3
    });
  });

  it("applies blocker-evidence downgrade then round auto-demote without schema duplicate noise", () => {
    const inputFinding: Finding = {
      priority: "P1",
      timing: "required-now",
      layer: "L1",
      title: "Blocker claim without evidence after round gate threshold"
    };
    const result = evaluateReviewerGateWarnings({
      round: 3,
      roundGateAppliesAfter: 2,
      findings: [inputFinding]
    });

    expect(result.findingEvaluations[0]?.priority).toBe("P1");
    expect(result.findingEvaluations[0]?.effective_priority).toBe("P2");
    expect(result.findingEvaluations[0]?.effective_timing).toBe("later-hardening");
    expect(result.normalizedFindings[0]?.timing).toBe("later-hardening");
    expect(result.warnings.some((entry) => entry.reason_code === "BLOCKER_EVIDENCE_WARNING")).toBe(true);
    const roundAutoDemote = result.warnings.find(
      (entry) => entry.reason_code === "ROUND_GATE_AUTODEMOTE"
    );
    expect(roundAutoDemote).toBeDefined();
    expect(roundAutoDemote?.message).toContain("already established by blocker-evidence");
    expect(result.warnings.some((entry) => entry.reason_code === "ROUND_GATE_WARNING")).toBe(true);
    expect(result.warnings.some((entry) => entry.reason_code === "REVIEW_SCHEMA_WARNING")).toBe(false);
    expect(inputFinding.timing).toBe("required-now");
    expect(inputFinding).not.toHaveProperty("effective_priority");
  });

  it("includes both blocker-evidence and blocker-layer reasons in round auto-demote narrative when both apply", () => {
    const result = evaluateReviewerGateWarnings({
      round: 3,
      roundGateAppliesAfter: 2,
      findings: [
        {
          priority: "P1",
          timing: "required-now",
          title: "Missing layer and evidence on blocker claim"
        }
      ]
    });

    expect(result.warnings.some((entry) => entry.reason_code === "REVIEW_SCHEMA_WARNING")).toBe(true);
    expect(result.warnings.some((entry) => entry.reason_code === "BLOCKER_EVIDENCE_WARNING")).toBe(true);
    const autoDemote = result.warnings.find(
      (entry) => entry.reason_code === "ROUND_GATE_AUTODEMOTE"
    );
    expect(autoDemote?.message).toContain("blocker-evidence + blocker-layer");
  });

  it("drops stale effective_priority from normalized findings when no downgrade applies", () => {
    const result = evaluateReviewerGateWarnings({
      round: 1,
      roundGateAppliesAfter: 2,
      findings: [
        {
          priority: "P2",
          severity: "P2",
          timing: "later-hardening",
          layer: "L1",
          evidence: "src/example.ts:20",
          title: "Already non-blocking",
          effective_priority: "P1"
        }
      ]
    });

    expect(result.findingEvaluations[0]?.effective_priority).toBe("P2");
    expect(result.normalizedFindings[0]).not.toHaveProperty("effective_priority");
  });

  it("normalizes invalid timing values to later-hardening when timing field is present", () => {
    const inputFinding = {
      priority: "P2",
      timing: "urgent",
      layer: "L1",
      evidence: "docs/spec.md:10",
      title: "Invalid timing input"
    } as unknown as Finding;
    const result = evaluateReviewerGateWarnings({
      round: 1,
      roundGateAppliesAfter: 2,
      findings: [inputFinding]
    });

    expect(result.normalizedFindings[0]?.timing).toBe("later-hardening");
    expect(result.findingEvaluations[0]?.timing).toBe("later-hardening");
    expect(result.findingEvaluations[0]?.effective_timing).toBe("later-hardening");
    expect(inputFinding.timing).toBe("urgent");
  });

  it("re-derives spec lock state from open_blocker_count when artifact contains inconsistent state", async () => {
    const root = await mkdtemp(join(tmpdir(), "pairflow-gates-"));
    tempDirs.push(root);
    const artifactPath = resolveDocContractGateArtifactPath(root);

    await writeFile(
      artifactPath,
      JSON.stringify(
        {
          schema_version: 1,
          updated_at: "2026-03-05T12:35:00.000Z",
          task_warnings: [],
          config_warnings: [],
          review_warnings: [],
          finding_evaluations: [],
          round_gate_state: {
            applies: false,
            violated: false,
            round: 1
          },
          spec_lock_state: {
            state: "LOCKED",
            open_blocker_count: 0,
            open_required_now_count: 3
          }
        },
        null,
        2
      ),
      "utf8"
    );

    const artifact = await readDocContractGateArtifact(artifactPath);
    expect(artifact?.spec_lock_state.open_blocker_count).toBe(0);
    expect(artifact?.spec_lock_state.state).toBe("IMPLEMENTABLE");
  });

  it("falls back to round=1 when finding_key does not match strict round format", async () => {
    const root = await mkdtemp(join(tmpdir(), "pairflow-gates-"));
    tempDirs.push(root);
    const artifactPath = resolveDocContractGateArtifactPath(root);

    await writeFile(
      artifactPath,
      JSON.stringify(
        {
          schema_version: 1,
          updated_at: "2026-03-05T12:45:00.000Z",
          task_warnings: [],
          config_warnings: [],
          review_warnings: [],
          finding_evaluations: [
            {
              finding_key: "r2oops",
              priority: "P2",
              effective_priority: "P2",
              timing: "required-now",
              effective_timing: "later-hardening",
              layer: "L1"
            }
          ],
          round_gate_state: {},
          spec_lock_state: {
            state: "IMPLEMENTABLE",
            open_blocker_count: 0,
            open_required_now_count: 0
          }
        },
        null,
        2
      ),
      "utf8"
    );

    const artifact = await readDocContractGateArtifact(artifactPath);
    expect(artifact?.round_gate_state.round).toBe(1);
  });

  it("uses maximum parsed finding round for fallback round inference", async () => {
    const root = await mkdtemp(join(tmpdir(), "pairflow-gates-"));
    tempDirs.push(root);
    const artifactPath = resolveDocContractGateArtifactPath(root);

    await writeFile(
      artifactPath,
      JSON.stringify(
        {
          schema_version: 1,
          updated_at: "2026-03-05T12:46:00.000Z",
          task_warnings: [],
          config_warnings: [],
          review_warnings: [],
          finding_evaluations: [
            {
              finding_key: "r2:f1",
              priority: "P2",
              effective_priority: "P2",
              timing: "later-hardening",
              effective_timing: "later-hardening",
              layer: "L1"
            },
            {
              finding_key: "r5:f2",
              priority: "P1",
              effective_priority: "P1",
              timing: "required-now",
              effective_timing: "required-now",
              layer: "L1"
            },
            {
              finding_key: "invalid",
              priority: "P2",
              effective_priority: "P2",
              timing: "later-hardening",
              effective_timing: "later-hardening",
              layer: "L1"
            }
          ],
          round_gate_state: {},
          spec_lock_state: {
            state: "IMPLEMENTABLE",
            open_blocker_count: 0,
            open_required_now_count: 0
          }
        },
        null,
        2
      ),
      "utf8"
    );

    const artifact = await readDocContractGateArtifact(artifactPath);
    expect(artifact?.round_gate_state.round).toBe(5);
  });
});
