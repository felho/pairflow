import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { createBubbleWatchdogError } from "../../../shared/watchdog/watchdogCommandError.js";
import {
  getWatchdogPaneActivityPath,
  type WatchdogPaneActivityRecord,
  type ReadWatchdogPaneActivityResult
} from "../../../shared/watchdog/watchdogPaneActivityStore.js";

export { getWatchdogPaneActivityPath } from "../../../shared/watchdog/watchdogPaneActivityStore.js";

const watchdogPaneActivityFieldInvalidReasonCode =
  "WATCHDOG_PANE_ACTIVITY_FIELD_INVALID";
const watchdogPaneActivityRecordInvalidReasonCode =
  "WATCHDOG_PANE_ACTIVITY_RECORD_INVALID";
const watchdogPaneActivityStatusInvalidReasonCode =
  "WATCHDOG_PANE_ACTIVITY_STATUS_INVALID";
const watchdogPaneActivityBubbleMismatchReasonCode =
  "WATCHDOG_PANE_ACTIVITY_BUBBLE_ID_MISMATCH";

function createPaneActivityStoreError(input: {
  reasonCode: string;
  message: string;
  context: PairflowCommandErrorContext;
  cause?: unknown;
}): Error {
  return createBubbleWatchdogError(input);
}

function describeUnknownValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (
    typeof value === "number"
    || typeof value === "boolean"
    || typeof value === "bigint"
  ) {
    return String(value);
  }
  if (value === null) {
    return "null";
  }
  if (value === undefined) {
    return "undefined";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  return typeof value;
}

function requireNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw createPaneActivityStoreError({
      reasonCode: watchdogPaneActivityFieldInvalidReasonCode,
      message: `${fieldName} must be a string.`,
      context: {
        subsystem: "watchdog_pane_activity_store",
        field_name: fieldName,
        expected_type: "string",
        received_type: value === null ? "null" : typeof value
      }
    });
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw createPaneActivityStoreError({
      reasonCode: watchdogPaneActivityFieldInvalidReasonCode,
      message: `${fieldName} cannot be empty.`,
      context: {
        subsystem: "watchdog_pane_activity_store",
        field_name: fieldName,
        constraint: "non_empty_string"
      }
    });
  }
  return trimmed;
}

function parseWatchdogPaneActivityRecord(value: unknown): WatchdogPaneActivityRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw createPaneActivityStoreError({
      reasonCode: watchdogPaneActivityRecordInvalidReasonCode,
      message: "watchdog pane activity record must be a JSON object.",
      context: {
        subsystem: "watchdog_pane_activity_store",
        expected_type: "object",
        received_type:
          value === null
            ? "null"
            : Array.isArray(value)
              ? "array"
              : typeof value
      }
    });
  }

  const typed = value as Record<string, unknown>;
  const lastSampleStatusRaw = typed.last_sample_status;
  let lastSampleStatus: WatchdogPaneActivityRecord["last_sample_status"];
  if (lastSampleStatusRaw !== undefined) {
    if (
      lastSampleStatusRaw !== "sampled"
      && lastSampleStatusRaw !== "no_session"
      && lastSampleStatusRaw !== "pane_unreadable"
    ) {
      throw createPaneActivityStoreError({
        reasonCode: watchdogPaneActivityStatusInvalidReasonCode,
        message: "last_sample_status must be sampled, no_session, or pane_unreadable.",
        context: {
          subsystem: "watchdog_pane_activity_store",
          field_name: "last_sample_status",
          received_value: describeUnknownValue(lastSampleStatusRaw)
        }
      });
    }
    lastSampleStatus = lastSampleStatusRaw;
  }

  return {
    bubble_id: requireNonEmptyString(typed.bubble_id, "bubble_id"),
    sampled_at: requireNonEmptyString(typed.sampled_at, "sampled_at"),
    pane_hash: requireNonEmptyString(typed.pane_hash, "pane_hash"),
    last_changed_at: requireNonEmptyString(typed.last_changed_at, "last_changed_at"),
    ...(typeof typed.session_name === "string" && typed.session_name.trim().length > 0
      ? { session_name: typed.session_name.trim() }
      : {}),
    ...(typeof typed.target_pane === "string" && typed.target_pane.trim().length > 0
      ? { target_pane: typed.target_pane.trim() }
      : {}),
    ...(lastSampleStatus !== undefined ? { last_sample_status: lastSampleStatus } : {}),
    ...(typeof typed.last_sample_error === "string" && typed.last_sample_error.length > 0
      ? { last_sample_error: typed.last_sample_error }
      : {})
  };
}

function serializeWatchdogPaneActivityRecord(
  record: WatchdogPaneActivityRecord
): string {
  return `${JSON.stringify(record, null, 2)}\n`;
}

export async function readWatchdogPaneActivity(input: {
  runtimeDir: string;
  bubbleId: string;
}): Promise<ReadWatchdogPaneActivityResult> {
  const path = getWatchdogPaneActivityPath(input.runtimeDir, input.bubbleId);

  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (error) {
    const typedError = error as NodeJS.ErrnoException;
    if (typedError.code === "ENOENT") {
      return {
        status: "missing"
      };
    }
    throw error;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      status: "invalid",
      error: `Invalid watchdog pane activity JSON: ${reason}`
    };
  }

  try {
    const record = parseWatchdogPaneActivityRecord(parsed);
    if (record.bubble_id !== input.bubbleId) {
      return {
        status: "invalid",
        error: `Watchdog pane activity bubble_id mismatch: expected ${input.bubbleId}, found ${record.bubble_id}.`
      };
    }
    return {
      status: "ok",
      record
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      status: "invalid",
      error: `Invalid watchdog pane activity record: ${reason}`
    };
  }
}

export async function writeWatchdogPaneActivity(input: {
  runtimeDir: string;
  bubbleId: string;
  record: WatchdogPaneActivityRecord;
}): Promise<string> {
  if (input.record.bubble_id !== input.bubbleId) {
    throw createPaneActivityStoreError({
      reasonCode: watchdogPaneActivityBubbleMismatchReasonCode,
      message:
        `Watchdog pane activity bubble_id mismatch: expected ${input.bubbleId}, found ${input.record.bubble_id}.`,
      context: {
        subsystem: "watchdog_pane_activity_store",
        expected_bubble_id: input.bubbleId,
        actual_bubble_id: input.record.bubble_id
      }
    });
  }

  const path = getWatchdogPaneActivityPath(input.runtimeDir, input.bubbleId);
  const parentDir = dirname(path);
  await mkdir(parentDir, { recursive: true });

  const tempPath = join(parentDir, `.watchdog-pane-${randomUUID()}.tmp`);
  try {
    await writeFile(
      tempPath,
      serializeWatchdogPaneActivityRecord(input.record),
      "utf8"
    );
    await rename(tempPath, path);
  } catch (error) {
    await rm(tempPath, { force: true }).catch(() => undefined);
    throw error;
  }

  return path;
}

export async function removeWatchdogPaneActivity(input: {
  runtimeDir: string;
  bubbleId: string;
}): Promise<void> {
  const path = getWatchdogPaneActivityPath(input.runtimeDir, input.bubbleId);
  try {
    await rm(path);
  } catch (error) {
    const typedError = error as NodeJS.ErrnoException;
    if (typedError.code === "ENOENT") {
      return;
    }
    throw error;
  }
}
