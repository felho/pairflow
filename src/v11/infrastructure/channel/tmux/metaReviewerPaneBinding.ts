import {
  getTopologySlotPaneIndex,
  getTopologySlotPaneIndexForRole
} from "../../../application/actorProtocol/roleDescriptorRegistry.js";
import {
  RuntimeSessionsRegistryError,
  readRuntimeSessionsRegistry,
  type RuntimeMetaReviewerPaneBinding,
  type RuntimeSessionRecord,
  withRuntimeSessionsRegistryLock,
  writeRuntimeSessionsRegistry
} from "../../executor/sessionRuntime/runtimeSessionsRegistry.js";

export interface SetMetaReviewerPaneBindingInput {
  sessionsPath: string;
  bubbleId: string;
  active: boolean;
  now?: Date;
  lockTimeoutMs?: number;
}

export type SetMetaReviewerPaneBindingResult =
  | {
    updated: false;
    reason: "no_runtime_session" | "shared_runtime_pane";
    record?: undefined;
  }
  | {
    updated: true;
    record: RuntimeSessionRecord;
    reason?: undefined;
  }
  | {
    updated: true;
    reason: "durable_handoff_only";
    record?: undefined;
  };

function requireNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new RuntimeSessionsRegistryError(`${fieldName} must be a string.`, {
      context: {
        fieldName,
        reason: "field_not_string"
      }
    });
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new RuntimeSessionsRegistryError(`${fieldName} cannot be empty.`, {
      context: {
        fieldName,
        reason: "field_empty"
      }
    });
  }
  return trimmed;
}

function hasSharedRuntimePaneCollision(): boolean {
  const metaReviewerPaneIndex = Number(
    getTopologySlotPaneIndexForRole("meta_reviewer")
  );
  const statusPaneIndex = Number(getTopologySlotPaneIndex("status"));
  const implementerPaneIndex = Number(
    getTopologySlotPaneIndexForRole("implementer")
  );
  return (
    metaReviewerPaneIndex === statusPaneIndex ||
    metaReviewerPaneIndex === implementerPaneIndex
  );
}

export async function setMetaReviewerPaneBinding(
  input: SetMetaReviewerPaneBindingInput
): Promise<SetMetaReviewerPaneBindingResult> {
  return withRuntimeSessionsRegistryLock(
    input.sessionsPath,
    input.lockTimeoutMs ?? 5_000,
    async () => {
      const registry = await readRuntimeSessionsRegistry(input.sessionsPath, {
        allowMissing: true
      });
      const bubbleId = requireNonEmptyString(input.bubbleId, "bubbleId");
      const existing = registry[bubbleId];
      if (existing === undefined) {
        return {
          updated: false,
          reason: "no_runtime_session"
        };
      }
      if (hasSharedRuntimePaneCollision()) {
        return {
          updated: false,
          reason: "shared_runtime_pane"
        };
      }

      const nowIso = (input.now ?? new Date()).toISOString();
      const metaReviewerPane: RuntimeMetaReviewerPaneBinding = {
        role: "meta-reviewer",
        paneIndex: getTopologySlotPaneIndexForRole("meta_reviewer"),
        active: input.active,
        updatedAt: nowIso
      };

      const nextRecord: RuntimeSessionRecord = {
        ...existing,
        updatedAt: nowIso,
        metaReviewerPane
      };
      registry[bubbleId] = nextRecord;
      await writeRuntimeSessionsRegistry(input.sessionsPath, registry);
      return {
        updated: true,
        record: nextRecord
      };
    }
  );
}
