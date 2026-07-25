import type { DiagnosticEventBody, DiagnosticsSink } from "../ports/diagnostics.js";
import type { InstanceDetail } from "../ports/store.js";
import type { DeliveryReadSeam } from "./deliveryLoop.js";
import type { ErrandRow, ErrandStore } from "./errandStore.js";

/**
 * The runner-plane module face (packet ch9-p3a, T2 — the new module home
 * `src/runner/`). The errand ledger, the delivery loop, and the ONLY
 * module-public read path: the reader facade, composed WITH the kernel read
 * seam so CF3's read-time re-check is structurally unbypassable (a raw store
 * handle read never leaves the module).
 */

export {
  openErrandStore,
  ErrandStoreError,
} from "./errandStore.js";
export type {
  AttemptKind,
  AttemptRecord,
  DiscoveryMark,
  ErrandRow,
  ErrandStore,
  ErrandStoreHandle,
  OpenErrandStoreOptions,
} from "./errandStore.js";

export { createDeliveryLoop } from "./deliveryLoop.js";
export type {
  DeliveryLoop,
  DeliveryLoopDeps,
  DeliveryLoopOptions,
  DeliveryReadSeam,
  DeliveryWait,
} from "./deliveryLoop.js";

// packet ch9-p3b (T1): the runner-plane spawn seam, the real actor adapter,
// the relocated C8 encoding + session-name derivation, and AV2's env-name
// constant pair. The wrapper asset is spawned, never imported.
export { disciplinedSpawn, validateTimerKnobs, TimerKnobError } from "./spawn.js";
export type { SpawnConclusion, DisciplinedSpawnInput, TimerKnob, DerivedTimer } from "./spawn.js";
export { enc, defaultSessionNamer } from "./enc.js";
export { createActorAdapter, PAIRFLOW_PACKET, PAIRFLOW_EMIT } from "./actorAdapter.js";
export type { ActorAdapterDeps, ActorAdapterOptions, ArgvMapper } from "./actorAdapter.js";

// packet ch9-p4a (T1): the real-spawn machinery — the process-gate runner
// (GR; NO shipped composition binds it until ch9-P4b, GR7), the spawn-channel
// seam + the direct channel (TX1), and the tmux session channel (TX2–TX6).
export { createProcessGateRunner, MEASUREMENT_FAILED_SENTINEL } from "./processGateRunner.js";
export type {
  ProcessGateRunnerDeps,
  ProcessGateRunnerHandle,
  ProcessGateRunnerOptions,
} from "./processGateRunner.js";
export { createDirectSpawnChannel } from "./spawnChannel.js";
export type { ChannelConclusion, SpawnChannel, SpawnChannelInput } from "./spawnChannel.js";
export { createTmuxSpawnChannel } from "./tmuxChannel.js";
export type { TmuxChannelDeps } from "./tmuxChannel.js";

/** The module-public errand read API (ES1/CF3/CF4 — ch9-P4b's floor basis). */
export interface ErrandReader {
  getErrand(instanceId: string, contextPacketId: string): Promise<ErrandRow | null>;
  listErrands(): Promise<readonly ErrandRow[]>;
}

// The RESTING non-confirmed dispositions (CF3): reads through the facade
// re-run the CF1 evidence predicate on these and flip `confirmed` on late
// evidence (a PRECEDENCE flip, never an exit edge — L5's exactly-one stands).
const RESTING_NON_CONFIRMED: ReadonlySet<string> = new Set(["unconfirmed", "exhausted", "mooted"]);

function evidencePresent(detail: InstanceDetail, errand: ErrandRow): boolean {
  for (const entry of detail.transcript) {
    if (entry.entryKind !== "transition") {
      continue;
    }
    if (
      entry.envelope.expectedVersion === errand.expectedVersion &&
      entry.envelope.actorId === errand.actorId
    ) {
      return true;
    }
  }
  return false;
}

/**
 * The reader facade (ES1/CF3): the sole module-public read path. Every read of
 * a RESTING non-confirmed disposition re-runs CF1 through the kernel read seam;
 * evidence found flips the row `confirmed` and emits the `evidence-promotion`
 * event (DG1, BARE). A raw errand store handle never leaves the module, so the
 * re-check cannot be bypassed.
 */
export function createErrandReader(
  store: ErrandStore,
  readSeam: DeliveryReadSeam,
  diag: DiagnosticsSink,
): ErrandReader {
  async function recheck(errand: ErrandRow): Promise<ErrandRow> {
    if (!RESTING_NON_CONFIRMED.has(errand.state)) {
      return errand;
    }
    const detail = await readSeam.getInstanceDetail(errand.instanceId);
    if (detail === null || !evidencePresent(detail, errand)) {
      return errand;
    }
    const res = store.concludeConfirmed({
      instanceId: errand.instanceId,
      contextPacketId: errand.contextPacketId,
    });
    if (res.applied) {
      const body: DiagnosticEventBody = {
        source: "runner",
        kind: "errand_transition",
        instanceId: errand.instanceId,
        contextPacketId: errand.contextPacketId,
        errandEdge: "evidence-promotion",
        errandTo: "confirmed",
        errandFrom: errand.state,
      };
      diag.emit(body);
    }
    const fresh = store.getErrand(errand.instanceId, errand.contextPacketId);
    return fresh ?? errand;
  }

  return {
    async getErrand(instanceId, contextPacketId) {
      const errand = store.getErrand(instanceId, contextPacketId);
      if (errand === null) {
        return null;
      }
      return recheck(errand);
    },
    async listErrands() {
      const errands = store.listErrands();
      const out: ErrandRow[] = [];
      for (const errand of errands) {
        out.push(await recheck(errand));
      }
      return out;
    },
  };
}
