import type {
  InstanceId,
  RuntimeContextProjection,
  RuntimeContextRef,
  RuntimeContextSpec,
} from "../domain/index.js";

/**
 * l0e/RuntimeContextProvider (packet ch12-p3, PR1; contract:ch12-runtime-core
 * #C15/#C22): a NAMED, core-adjacent fulfiller — the kernel owns the runtime-
 * context CONTRACT (resolve → provision → correlated kind-guarded READY →
 * projection), the provider owns the MECHANICS (git branch/worktree/clone —
 * ch9's real provider). A kernel-only INJECTED port (ADR-014); the kernel
 * never branches on a concrete provider type (REV-E-NO-ADAPTER-BRANCH).
 */
export interface RuntimeContextProvider {
  /**
   * Start provisioning. ASYNC, fire-and-forget from the kernel's view: the
   * awaited fulfillment is the DETACH ACKNOWLEDGMENT (the provider accepted
   * and detached its async work), NEVER the completion — the completion fires
   * `RUNTIME_CONTEXT_READY(instanceId, requestId, ref)` LATER through the
   * in-process completion seam. A SYNCHRONOUS throw, or the awaited
   * acknowledgment settling REJECTED before the START commit, is a PORT
   * BREACH (fail-loud, no state change; C18's must-detach obligation, S4).
   */
  provision(instanceId: InstanceId, requestId: string, spec: RuntimeContextSpec): Promise<void>;
  /**
   * The kind-specific actor-facing projection of a provisioned ref (PR1/E1):
   * kernel-internal fields stay out; the raw ref stays kernel-side
   * (`projection-never-the-ref`). SYNCHRONOUS. The returned value MUST be
   * canonical-JSON-safe (PR4) — a provider gates its own return.
   */
  projectForActor(ref: RuntimeContextRef): RuntimeContextProjection;
}

/**
 * l0e/ProviderRegistry (packet ch12-p3, PR2; contract:ch12-runtime-core
 * #C16/#C22): the STATIC, INJECTED, PER-CHAPTER registry — a pure lookup by
 * provider name. Injected at the composition root as ONE new required kernel
 * dependency; the PRODUCTION registry is EMPTY at ch12 (a spec-declaring
 * template is honestly unstartable through the shipped CLI —
 * `Rejected(runtime_context_provider_unavailable)` at START).
 */
export interface ProviderRegistry {
  resolve(providerName: string): RuntimeContextProvider | null;
}

/**
 * The completion delivered by a provider (via the composition-injected seam)
 * when its async provisioning finishes: the readiness for the request the
 * kernel issued.
 */
export type RuntimeContextCompletionSink = (
  instanceId: InstanceId,
  requestId: string,
  ref: RuntimeContextRef,
) => void;

/**
 * PR2: build the static injected registry from a fixed member map (own-key
 * lookup; a non-member resolves to `null`). The EMPTY production registry is
 * a call with no members (`createStaticProviderRegistry({})`).
 */
export function createStaticProviderRegistry(
  members: Readonly<Record<string, RuntimeContextProvider>>,
): ProviderRegistry {
  return {
    resolve(providerName: string): RuntimeContextProvider | null {
      return Object.prototype.hasOwnProperty.call(members, providerName)
        ? (members[providerName] ?? null)
        : null;
    },
  };
}
