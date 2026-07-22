import type {
  InstanceId,
  RuntimeContextProjection,
  RuntimeContextRef,
  RuntimeContextSpec,
} from "../domain/index.js";
import { isCanonicalizable } from "../emit/index.js";
import type {
  RuntimeContextCompletionSink,
  RuntimeContextProvider,
} from "../ports/runtimeContextProvider.js";

/**
 * `scriptedRuntimeContextProvider` (packet ch12-p3, PR3): the testkit
 * runtime-context provider — the `scriptedProcessGateRunner` player culture.
 * It RECORDS every `provision` call, plays configured per-call behavior
 * (plain detach; a SYNCHRONOUS-completion fire INSIDE `provision()` through
 * the bound completion sink — the SM hold hazard; the S4 port breaches — a
 * synchronous throw or a pre-commit-rejecting detach ack; the never-ready
 * hold), and returns a configured `projectForActor` view. It GATES its own
 * projection return canonical-JSON-safe (PR4). The registry NAME under which
 * it is registered is test-chosen data (C16); the kit imports ports/domain/
 * emit at most (ADR-005). REV-B: the record array is testkit surface, NEVER
 * authority.
 */

/** One recorded `provision` invocation. */
export interface ProvisionCall {
  readonly instanceId: InstanceId;
  readonly requestId: string;
  readonly spec: RuntimeContextSpec;
}

/** Per-provision-call behavior (indexed by call number). A missing entry =
 * plain DETACH (record + resolve, no completion fired — the trace default). */
export interface ScriptedProvisionBehavior {
  /** A SYNCHRONOUS throw inside `provision()` (S4 port breach). */
  readonly throwOnProvision?: boolean;
  /** A pre-commit-rejecting detach acknowledgment (S4 port breach). */
  readonly rejectAck?: boolean;
  /** Fire this READY completion SYNCHRONOUSLY inside `provision()` through the
   * bound sink — the SM hold hazard (the seam holds it until the START
   * commit). Requires a bound completion sink. */
  readonly fireOnProvision?: RuntimeContextRef;
}

export interface ScriptedRuntimeContextProviderOptions {
  /** Per-provision-call behaviors, indexed by call number. */
  readonly script?: readonly ScriptedProvisionBehavior[];
  /**
   * The `projectForActor` return VALUE (the kind-specific actor-facing view;
   * opaque to the kernel). Default: a deterministic `{ workspace: <locator> }`
   * view. MUST be canonical-JSON-safe (PR4) — gated at the return.
   */
  readonly projection?: unknown;
}

export interface ScriptedRuntimeContextProvider extends RuntimeContextProvider {
  /** The recorded provision calls, in order (live view — REV-B). */
  readonly provisionCalls: readonly ProvisionCall[];
  /** Bind the SM completion seam sink (LATE-bound: the kernel is created after
   * the provider is registered into the injected registry). */
  bindCompletionSink(sink: RuntimeContextCompletionSink): void;
}

export function createScriptedRuntimeContextProvider(
  options: ScriptedRuntimeContextProviderOptions = {},
): ScriptedRuntimeContextProvider {
  const provisionCalls: ProvisionCall[] = [];
  let sink: RuntimeContextCompletionSink | null = null;
  return {
    get provisionCalls(): readonly ProvisionCall[] {
      return provisionCalls;
    },
    bindCompletionSink(next: RuntimeContextCompletionSink): void {
      sink = next;
    },
    provision(instanceId: InstanceId, requestId: string, spec: RuntimeContextSpec): Promise<void> {
      // RECORD FIRST — the invocation was received regardless of the behavior
      // (the scriptedProcessGateRunner record-before-outcome culture).
      const callIndex = provisionCalls.length;
      provisionCalls.push({ instanceId, requestId, spec });
      const behavior = options.script?.[callIndex];
      if (behavior?.fireOnProvision !== undefined) {
        if (sink === null) {
          throw new Error(
            "scriptedRuntimeContextProvider: fireOnProvision requires a bound completion sink (bindCompletionSink)",
          );
        }
        // The completion fires SYNCHRONOUSLY inside provision() — the seam
        // must HOLD it until the START commit lands (SM1); the sink returns
        // immediately (SM2, no circular wait). Fired BEFORE any breach so the
        // held-then-failed-attempt SM3 backstop is exercisable.
        sink(instanceId, requestId, behavior.fireOnProvision);
      }
      if (behavior?.throwOnProvision === true) {
        // S4 port breach — a synchronous throw (fail-loud, no state change).
        throw new Error(
          "scriptedRuntimeContextProvider: scripted synchronous provision throw (S4 port breach)",
        );
      }
      if (behavior?.rejectAck === true) {
        // S4 port breach — the awaited detach ack settles REJECTED pre-commit.
        return Promise.reject(
          new Error(
            "scriptedRuntimeContextProvider: scripted pre-commit-rejecting detach ack (S4 port breach)",
          ),
        );
      }
      // The awaited fulfillment is the DETACH ACKNOWLEDGMENT (never the completion).
      return Promise.resolve();
    },
    projectForActor(ref: RuntimeContextRef): RuntimeContextProjection {
      const view: unknown =
        options.projection ?? { workspace: ref.locator, kind: ref.kind };
      // PR4: the provider gates its OWN return canonical-JSON-safe — a
      // violating return is a kernel/config integrity throw (fail-closed).
      if (!isCanonicalizable(view)) {
        throw new Error(
          "scriptedRuntimeContextProvider: configured projection is not canonical-JSON-safe (PR4)",
        );
      }
      return view as RuntimeContextProjection;
    },
  };
}
