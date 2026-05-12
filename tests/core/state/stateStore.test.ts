import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createInitialBubbleState } from "../../../src/v11/domain/state/initialState.js";
import {
  StateStoreConflictError,
  createStateSnapshot,
  inspectStateSnapshot,
  readStateSnapshot,
  writeStateSnapshot
} from "../../../src/v11/infrastructure/state/stateStore.js";
import { buildBubbleStateSnapshotVariant } from "../../../src/v11/domain/state/snapshot/buildBubbleStateSnapshot.js";
const tempDirs: string[] = [];

async function createTempDir(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-state-store-"));
  tempDirs.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("state store", () => {
  it("creates and reads state snapshot with fingerprint", async () => {
    const dir = await createTempDir();
    const statePath = join(dir, "state.json");

    const created = await createStateSnapshot(
      statePath,
      createInitialBubbleState("b_store_01")
    );
    const loaded = await readStateSnapshot(statePath);

    expect(loaded.state.bubble_id).toBe("b_store_01");
    expect(loaded.fingerprint).toBe(created.fingerprint);
  });

  it("writes snapshot when expected fingerprint matches", async () => {
    const dir = await createTempDir();
    const statePath = join(dir, "state.json");

    const created = await createStateSnapshot(
      statePath,
      createInitialBubbleState("b_store_02")
    );

    const next = {
      ...created.state,
      state: "PREPARING_WORKSPACE" as const
    };
    const written = await writeStateSnapshot(statePath, buildBubbleStateSnapshotVariant(next), {
      expectedFingerprint: created.fingerprint,
      expectedState: "CREATED"
    });

    expect(written.state.state).toBe("PREPARING_WORKSPACE");
    expect(written.fingerprint).not.toBe(created.fingerprint);
  });

  it("rejects writes on stale fingerprint", async () => {
    const dir = await createTempDir();
    const statePath = join(dir, "state.json");

    const created = await createStateSnapshot(
      statePath,
      createInitialBubbleState("b_store_03")
    );

    const newer = {
      ...created.state,
      state: "PREPARING_WORKSPACE" as const
    };
    await writeStateSnapshot(statePath, buildBubbleStateSnapshotVariant(newer), {
      expectedFingerprint: created.fingerprint
    });

    const staleAttempt = {
      ...created.state,
      state: "CANCELLED" as const
    };

    await expect(
      writeStateSnapshot(statePath, buildBubbleStateSnapshotVariant(staleAttempt), {
        expectedFingerprint: created.fingerprint
      })
    ).rejects.toBeInstanceOf(StateStoreConflictError);
  });

  it("supports CAS writes after inspect strips legacy meta-review fields", async () => {
    const dir = await createTempDir();
    const statePath = join(dir, "state.json");

    await writeFile(
      statePath,
      `${JSON.stringify({
        bubble_id: "b_store_legacy_meta_strip_01",
        state: "WAITING_HUMAN",
        round: 2,
        active_agent: "codex",
        active_since: "2026-03-08T10:00:00.000Z",
        active_role: "reviewer",
        round_role_history: [],
        last_command_at: "2026-03-08T10:01:00.000Z",
        meta_review: {
          execution_context: null,
          runtime_delivery: null,
          last_autonomous_run_id: "run_meta_strip_01",
          last_autonomous_status: "success",
          last_autonomous_recommendation: "approve",
          last_autonomous_summary: "Legacy fields should be stripped",
          last_autonomous_rework_target_message: null,
          last_autonomous_updated_at: "2026-03-08T10:01:00.000Z",
          auto_rework_count: 1,
          auto_rework_limit: 5,
          sticky_human_gate: false,
          consecutive_clean_runs: 0,
        }
      }, null, 2)}\n`,
      "utf8"
    );

    const inspected = await inspectStateSnapshot(statePath);

    expect(inspected.stateValidation).toBeNull();
    expect(inspected.state.meta_review).toEqual({
      execution_context: null,
      runtime_delivery: null,
      auto_rework_count: 1,
      auto_rework_limit: 5,
      sticky_human_gate: false,
      consecutive_clean_runs: 0,
    });

    const written = await writeStateSnapshot(
      statePath,
      buildBubbleStateSnapshotVariant({
        ...inspected.state,
        meta_review: {
          ...inspected.state.meta_review!,
          sticky_human_gate: true,
          consecutive_clean_runs: 0,
        }
      }),
      {
        expectedFingerprint: inspected.fingerprint,
        expectedState: "WAITING_HUMAN"
      }
    );

    expect(written.state.meta_review).toEqual({
      execution_context: null,
      runtime_delivery: null,
      auto_rework_count: 1,
      auto_rework_limit: 5,
      sticky_human_gate: true,
      consecutive_clean_runs: 0,
    });

    const rawState = await readFile(statePath, "utf8");
    expect(rawState).not.toContain("last_autonomous_run_id");
    expect(rawState).toContain('"sticky_human_gate": true');
  });

  it("rejects writes when state lock cannot be acquired in time", async () => {
    const dir = await createTempDir();
    const statePath = join(dir, "state.json");

    const created = await createStateSnapshot(
      statePath,
      createInitialBubbleState("b_store_04")
    );

    await writeFile(`${statePath}.lock`, "locked", "utf8");

    await expect(
      writeStateSnapshot(
        statePath,
        buildBubbleStateSnapshotVariant({
          ...created.state,
          state: "PREPARING_WORKSPACE"
        }),
        {
          expectedFingerprint: created.fingerprint,
          lockTimeoutMs: 20
        }
      )
    ).rejects.toBeInstanceOf(StateStoreConflictError);
  });

  it("returns inspectable diagnostics for RUNNING meta-review authority state without execution_context", async () => {
    const dir = await createTempDir();
    const statePath = join(dir, "state.json");

    await writeFile(
      statePath,
      `${JSON.stringify({
        bubble_id: "b_store_legacy_meta_01",
        state: "RUNNING",
        round: 2,
        active_agent: "codex",
        active_since: "2026-03-08T10:00:00.000Z",
        active_role: "meta_reviewer",
        round_role_history: [],
        last_command_at: "2026-03-08T10:01:00.000Z",
        meta_review: {
          execution_context: null,
          runtime_delivery: null,
          auto_rework_count: 0,
          auto_rework_limit: 5,
          sticky_human_gate: false,
          consecutive_clean_runs: 0,
        }
      }, null, 2)}\n`,
      "utf8"
    );

    const inspected = await inspectStateSnapshot(statePath);
    expect(inspected.state.state).toBe("RUNNING");
    expect(inspected.state.execution_context).toBeNull();
    expect(inspected.stateValidation?.errors).toEqual([
      {
        path: "execution_context",
        message:
          "RUNNING meta-review state requires canonical execution_context authority"
      }
    ]);

    await expect(readStateSnapshot(statePath)).rejects.toThrow("Invalid bubble state");
  });

  it("preserves runtime_delivery in inspect fallback snapshots", async () => {
    const dir = await createTempDir();
    const statePath = join(dir, "state.json");

    await writeFile(
      statePath,
      `${JSON.stringify({
        bubble_id: "b_store_runtime_delivery_01",
        state: "RUNNING",
        round: 2,
        active_agent: "codex",
        active_since: "2026-03-08T10:00:00.000Z",
        active_role: "meta_reviewer",
        round_role_history: [],
        last_command_at: 42,
        meta_review: {
          execution_context: {
            handoff_id: "meta_review:b_store_runtime_delivery_01:round:2:attempt:1",
            execution_id: "exec_store_runtime_delivery_01",
            round: 2,
            awaited_output_type: "meta_review_result",
            started_at: "2026-03-08T10:00:00.000Z",
            deadline_at: "2026-03-08T11:00:00.000Z",
            attempt: 1
          },
          runtime_delivery: {
            status: "uncertain",
            reason_code: "META_REVIEW_REQUEST_DELIVERY_UNCONFIRMED",
            message: "handoff delivery not confirmed",
            observed_at: "2026-03-08T10:01:00.000Z",
            observed_for_handoff_id: "handoff_meta_01",
            observed_for_round: 2
          },
          auto_rework_count: 0,
          auto_rework_limit: 5,
          sticky_human_gate: false,
          consecutive_clean_runs: 0,
        }
      }, null, 2)}\n`,
      "utf8"
    );

    const inspected = await inspectStateSnapshot(statePath);

    expect(inspected.state.meta_review?.runtime_delivery).toEqual({
      status: "uncertain",
      reason_code: "META_REVIEW_REQUEST_DELIVERY_UNCONFIRMED",
      message: "handoff delivery not confirmed",
      observed_at: "2026-03-08T10:01:00.000Z",
      observed_for_handoff_id: "handoff_meta_01",
      observed_for_round: 2
    });
    expect(inspected.state.meta_review?.execution_context).toEqual({
      handoff_id: "meta_review:b_store_runtime_delivery_01:round:2:attempt:1",
      execution_id: "exec_store_runtime_delivery_01",
      round: 2,
      awaited_output_type: "meta_review_result",
      started_at: "2026-03-08T10:00:00.000Z",
      deadline_at: "2026-03-08T11:00:00.000Z",
      attempt: 1
    });
    expect(inspected.state.execution_context).toBeNull();
    expect(inspected.stateValidation?.errors).toEqual([
      {
        path: "last_command_at",
        message: "Must be null or a valid ISO timestamp"
      },
      {
        path: "execution_context",
        message:
          "RUNNING meta-review state requires canonical execution_context authority"
      }
    ]);
  });

  it("fails closed for partially correlated runtime_delivery in inspect fallback snapshots", async () => {
    const dir = await createTempDir();
    const statePath = join(dir, "state.json");

    await writeFile(
      statePath,
      `${JSON.stringify({
        bubble_id: "b_store_runtime_delivery_partial_01",
        state: "RUNNING",
        round: 2,
        active_agent: "codex",
        active_since: "2026-03-08T10:00:00.000Z",
        active_role: "meta_reviewer",
        round_role_history: [],
        last_command_at: 42,
        meta_review: {
          execution_context: {
            handoff_id: "meta_review:b_store_runtime_delivery_partial_01:round:2:attempt:1",
            execution_id: "exec_store_runtime_delivery_partial_01",
            round: 2,
            awaited_output_type: "meta_review_result",
            started_at: "2026-03-08T10:00:00.000Z",
            deadline_at: "2026-03-08T11:00:00.000Z",
            attempt: 1
          },
          runtime_delivery: {
            status: "uncertain",
            reason_code: "META_REVIEW_REQUEST_DELIVERY_UNCONFIRMED",
            message: "handoff delivery not confirmed",
            observed_at: "2026-03-08T10:01:00.000Z",
            observed_for_handoff_id: "handoff_meta_01",
            observed_for_round: null
          },
          auto_rework_count: 0,
          auto_rework_limit: 5,
          sticky_human_gate: false,
          consecutive_clean_runs: 0,
        }
      }, null, 2)}\n`,
      "utf8"
    );

    const inspected = await inspectStateSnapshot(statePath);

    expect(inspected.state.meta_review?.runtime_delivery).toEqual({
      status: "uncertain",
      reason_code: "META_REVIEW_REQUEST_DELIVERY_UNCONFIRMED",
      message: "handoff delivery not confirmed",
      observed_at: "2026-03-08T10:01:00.000Z",
      observed_for_handoff_id: null,
      observed_for_round: null
    });
    expect(inspected.stateValidation?.errors).toEqual([
      {
        path: "last_command_at",
        message: "Must be null or a valid ISO timestamp"
      },
      {
        path: "meta_review.runtime_delivery.observed_for_handoff_id",
        message:
          "Must be null when observed_for_round is null, and provided together when correlation is claimed"
      },
      {
        path: "meta_review.runtime_delivery.observed_for_round",
        message:
          "Must be null when observed_for_handoff_id is null, and provided together when correlation is claimed"
      },
      {
        path: "execution_context",
        message:
          "RUNNING meta-review state requires canonical execution_context authority"
      }
    ]);
  });

  it("fails closed for reverse-direction partial runtime_delivery in inspect fallback snapshots", async () => {
    const dir = await createTempDir();
    const statePath = join(dir, "state.json");

    await writeFile(
      statePath,
      `${JSON.stringify({
        bubble_id: "b_store_runtime_delivery_partial_02",
        state: "RUNNING",
        round: 2,
        active_agent: "codex",
        active_since: "2026-03-08T10:00:00.000Z",
        active_role: "meta_reviewer",
        round_role_history: [],
        last_command_at: 42,
        meta_review: {
          execution_context: {
            handoff_id: "meta_review:b_store_runtime_delivery_partial_02:round:2:attempt:1",
            execution_id: "exec_store_runtime_delivery_partial_02",
            round: 2,
            awaited_output_type: "meta_review_result",
            started_at: "2026-03-08T10:00:00.000Z",
            deadline_at: "2026-03-08T11:00:00.000Z",
            attempt: 1
          },
          runtime_delivery: {
            status: "uncertain",
            reason_code: "META_REVIEW_REQUEST_DELIVERY_UNCONFIRMED",
            message: "handoff delivery not confirmed",
            observed_at: "2026-03-08T10:01:00.000Z",
            observed_for_handoff_id: null,
            observed_for_round: 2
          },
          auto_rework_count: 0,
          auto_rework_limit: 5,
          sticky_human_gate: false,
          consecutive_clean_runs: 0,
        }
      }, null, 2)}\n`,
      "utf8"
    );

    const inspected = await inspectStateSnapshot(statePath);

    expect(inspected.state.meta_review?.runtime_delivery).toEqual({
      status: "uncertain",
      reason_code: "META_REVIEW_REQUEST_DELIVERY_UNCONFIRMED",
      message: "handoff delivery not confirmed",
      observed_at: "2026-03-08T10:01:00.000Z",
      observed_for_handoff_id: null,
      observed_for_round: null
    });
    expect(inspected.stateValidation?.errors).toEqual([
      {
        path: "last_command_at",
        message: "Must be null or a valid ISO timestamp"
      },
      {
        path: "meta_review.runtime_delivery.observed_for_handoff_id",
        message:
          "Must be null when observed_for_round is null, and provided together when correlation is claimed"
      },
      {
        path: "meta_review.runtime_delivery.observed_for_round",
        message:
          "Must be null when observed_for_handoff_id is null, and provided together when correlation is claimed"
      },
      {
        path: "execution_context",
        message:
          "RUNNING meta-review state requires canonical execution_context authority"
      }
    ]);
  });

  it("fails closed when inspect encounters pre-E1 execution authority snapshots", async () => {
    const dir = await createTempDir();
    const statePath = join(dir, "state.json");

    await writeFile(
      statePath,
      `${JSON.stringify({
        bubble_id: "b_store_pre_e1_inspect_01",
        state: "RUNNING",
        round: 2,
        active_agent: "codex",
        active_since: "2026-03-08T10:00:00.000Z",
        active_role: "implementer",
        execution_context: {
          active_role: "implementer",
          handoff_id: "implementer:b_store_pre_e1_inspect_01:round:2:attempt:1",
          round: 2,
          awaited_output_type: "pass_result",
          started_at: "2026-03-08T10:00:00.000Z",
          deadline_at: "2026-03-08T10:30:00.000Z",
          attempt: 1
        },
        round_role_history: [],
        last_command_at: "2026-03-08T10:01:00.000Z"
      }, null, 2)}\n`,
      "utf8"
    );

    await expect(inspectStateSnapshot(statePath)).rejects.toSatisfy((error) => {
      expect(error).toMatchObject({
        name: "SchemaValidationError",
        message:
          "INSPECT_STATE_PRE_E1_EXECUTION_AUTHORITY_REJECTED: inspection rejected a pre-E1 execution authority snapshot; fresh authority remint is required."
      });
      expect((error as { errors: { path: string; message: string }[] }).errors)
        .toContainEqual({
          path: "execution_context.execution_id",
          message:
            "ACTOR_EMIT_CONTEXT_PRE_E1_EXECUTION_ID_MISSING: pre-E1 execution_context snapshots without execution_id are unsupported"
        });
      return true;
    });
  });

  it("fails closed with explicit inspection diagnostics for pre-E1 nested meta-review authority snapshots", async () => {
    const dir = await createTempDir();
    const statePath = join(dir, "state.json");

    await writeFile(
      statePath,
      `${JSON.stringify({
        bubble_id: "b_store_pre_e1_nested_inspect_01",
        state: "READY_FOR_HUMAN_APPROVAL",
        round: 2,
        active_agent: null,
        active_since: null,
        active_role: null,
        execution_context: null,
        round_role_history: [],
        last_command_at: "2026-03-08T10:01:00.000Z",
        meta_review: {
          execution_context: {
            handoff_id:
              "meta_review:b_store_pre_e1_nested_inspect_01:round:2:attempt:1",
            round: 2,
            awaited_output_type: "meta_review_result",
            started_at: "2026-03-08T10:00:00.000Z",
            deadline_at: "2026-03-08T11:00:00.000Z",
            attempt: 1
          },
          runtime_delivery: null,
          auto_rework_count: 0,
          auto_rework_limit: 5,
          sticky_human_gate: false,
          consecutive_clean_runs: 0,
        }
      }, null, 2)}\n`,
      "utf8"
    );

    await expect(inspectStateSnapshot(statePath)).rejects.toSatisfy((error) => {
      expect(error).toMatchObject({
        name: "SchemaValidationError",
        message:
          "INSPECT_STATE_PRE_E1_EXECUTION_AUTHORITY_REJECTED: inspection rejected a pre-E1 execution authority snapshot; fresh authority remint is required."
      });
      expect((error as { errors: { path: string; message: string }[] }).errors)
        .toContainEqual({
          path: "meta_review.execution_context.execution_id",
          message:
            "ACTOR_EMIT_CONTEXT_PRE_E1_EXECUTION_ID_MISSING: pre-E1 meta_review.execution_context snapshots without execution_id are unsupported"
        });
      return true;
    });
  });

  it("preserves round role and rework intent diagnostics in inspect fallback snapshots", async () => {
    const dir = await createTempDir();
    const statePath = join(dir, "state.json");

    await writeFile(
      statePath,
      `${JSON.stringify({
        bubble_id: "b_store_inspect_preserve_01",
        state: "WAITING_HUMAN",
        round: 2,
        active_agent: null,
        active_since: null,
        active_role: null,
        round_role_history: [
          {
            round: 1,
            implementer: "codex",
            reviewer: "claude",
            switched_at: "2026-03-08T10:00:00.000Z"
          }
        ],
        last_command_at: 42,
        pending_rework_intent: {
          intent_id: "intent_waiting_human_01",
          message: "Need canonical authority follow-up",
          refs: ["artifacts/review.md"],
          requested_by: "claude",
          requested_at: "2026-03-08T10:05:00.000Z",
          status: "pending"
        },
        rework_intent_history: [
          {
            intent_id: "intent_applied_01",
            message: "Previous follow-up",
            requested_by: "claude",
            requested_at: "2026-03-08T09:30:00.000Z",
            status: "applied"
          }
        ]
      }, null, 2)}\n`,
      "utf8"
    );

    const inspected = await inspectStateSnapshot(statePath);

    expect(inspected.state.round_role_history).toEqual([
      {
        round: 1,
        implementer: "codex",
        reviewer: "claude",
        switched_at: "2026-03-08T10:00:00.000Z"
      }
    ]);
    expect(inspected.state.pending_rework_intent).toEqual({
      intent_id: "intent_waiting_human_01",
      message: "Need canonical authority follow-up",
      refs: ["artifacts/review.md"],
      requested_by: "claude",
      requested_at: "2026-03-08T10:05:00.000Z",
      status: "pending"
    });
    expect(inspected.state.rework_intent_history).toEqual([
      {
        intent_id: "intent_applied_01",
        message: "Previous follow-up",
        requested_by: "claude",
        requested_at: "2026-03-08T09:30:00.000Z",
        status: "applied"
      }
    ]);
    expect(inspected.stateValidation?.errors).toEqual([
      {
        path: "last_command_at",
        message: "Must be null or a valid ISO timestamp"
      }
    ]);
  });
});
