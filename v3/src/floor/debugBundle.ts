import type {
  EpochMillis,
  EventEnvelope,
  InstanceId,
  OpId,
  TranscriptEntry,
  WorkflowInstance,
} from "../domain/index.js";
import type { RedactionPolicy } from "../ports/redaction.js";
import type { StorePort } from "../ports/store.js";

/**
 * The debug bundle (plan §6.4, packet ch6-P3): ONE read-only export of
 * one run, reading from the store ONLY — env/runtime material cannot
 * enter by construction. FOUNDATION ONLY: the operator/dev bundle-dump
 * verb activates in P4; this module is the format + the policy seam.
 *
 * The shape below IS the canonical bundle schema (the packet's matrix;
 * the single source for the keyset tests and the P4 JSON consumer).
 * Unknown instance = null (the §6.2 read-surface duality).
 */
export interface BundleEnvelopeMeta {
  readonly instanceId: InstanceId;
  readonly opId: OpId;
  readonly type: string;
  readonly actorId: string;
  readonly expectedVersion?: number;
  /** Delivery provenance, pass-through (optional on EventEnvelope). */
  readonly eventId?: string;
  /** Distinguishes "payload omitted by policy" from "never had one". */
  readonly hasPayload: boolean;
  /** Present ONLY when hasPayload AND the policy admits it. */
  readonly payload?: unknown;
}

export interface BundleTranscriptRow {
  readonly seq: number;
  readonly committedAt: EpochMillis;
  readonly payloadDigest: string;
  readonly envelope: BundleEnvelopeMeta;
}

/** A stated gap, never a silent one (ratification finding). */
export interface RejectedInputsSection {
  readonly status: "absent";
  readonly reason: string;
}

export interface DebugBundle {
  readonly formatVersion: 1;
  /** The RedactionPolicy id this bundle was produced under. */
  readonly policy: string;
  readonly instance: WorkflowInstance;
  readonly transcript: readonly BundleTranscriptRow[];
  readonly rejectedInputs: RejectedInputsSection;
}

/**
 * The production default (the closed memo's secret-exfil guardrail):
 * payloads do NOT appear; hasPayload + payloadDigest remain as the
 * fingerprint. The normal CLI graph MUST bind this policy
 * (REV-BUNDLE-DEFAULT-POLICY, verified at the P4 review).
 */
export const redactPayloadsPolicy: RedactionPolicy = {
  id: "redact-payloads",
  includePayload: () => false,
};

export interface DebugBundleExporter {
  exportDebugBundle(instanceId: InstanceId): Promise<DebugBundle | null>;
}

export function createDebugBundleExporter(
  store: StorePort,
  policy: RedactionPolicy,
): DebugBundleExporter {
  return {
    async exportDebugBundle(instanceId: InstanceId): Promise<DebugBundle | null> {
      const detail = await store.getInstanceDetail(instanceId);
      if (detail === null) {
        return null;
      }
      return {
        formatVersion: 1,
        policy: policy.id,
        instance: detail.instance,
        transcript: detail.transcript.map((entry) => toBundleRow(entry, policy)),
        rejectedInputs: {
          status: "absent",
          reason: "diagnostic channel lands ch 7",
        },
      };
    },
  };
}

function toBundleRow(entry: TranscriptEntry, policy: RedactionPolicy): BundleTranscriptRow {
  const envelope: EventEnvelope = entry.envelope;
  const hasPayload = "payload" in envelope;
  return {
    seq: entry.seq,
    committedAt: entry.committedAt,
    payloadDigest: entry.payloadDigest,
    envelope: {
      instanceId: envelope.instanceId,
      opId: envelope.opId,
      type: envelope.type,
      actorId: envelope.actorId,
      ...(envelope.expectedVersion !== undefined
        ? { expectedVersion: envelope.expectedVersion }
        : {}),
      ...(envelope.eventId !== undefined ? { eventId: envelope.eventId } : {}),
      hasPayload,
      ...(hasPayload && policy.includePayload(envelope)
        ? { payload: envelope.payload }
        : {}),
    },
  };
}
