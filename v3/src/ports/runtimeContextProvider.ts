import type {
  InstanceId,
  RuntimeContextCompletion,
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
   * Start provisioning. ASYNC from the kernel's view: the awaited fulfillment
   * is the DETACH ACKNOWLEDGMENT (the provider accepted the call), NEVER the
   * completion ITSELF. The completion fires through the in-process completion
   * seam as ONE of two mutually exclusive kinds per `request_id` (ch9-P1 W1) —
   * and it MAY fire SYNCHRONOUSLY inside `provision()`, BEFORE the
   * acknowledgment resolves (the worktree provider does exactly this; the seam
   * HOLDS the fired completion and releases it at the START attempt's
   * conclusion — contract:ch9-runner PB2), OR later async. Either way the
   * acknowledgment is never the completion; the two kinds are:
   *   - `ready(ref)` — the readiness for the request the kernel issued, OR
   *   - `failed(reason, detail?)` — a provisioning failure (the `RUNTIME_CONTEXT_
   *     FAILED` channel: `reason` a `ProvisioningFailureReason`, `detail`
   *     optional untrusted free text).
   *
   * The unconditional-detach obligation (ch9-P1 W2; contract:ch9-runner#C11):
   * `provision()` ACCEPTS and DETACHES for every shape-valid call, and EVERY
   * provisioning failure — config rejection INCLUDED — travels the FAILED
   * completion channel, NEVER a throw. A SYNCHRONOUS throw, or the awaited
   * acknowledgment settling REJECTED before the START commit, is a PORT BREACH
   * (fail-loud, no state change; C18's must-detach obligation, S4) — RESERVED
   * for genuine programming errors, never a business/config failure.
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
 * l0e/LocalExecutionCapability (packet ch9-p3b, H1 — flag F5; contract:ch9-
 * runner#C17): a SEPARATE optional capability interface beside the base
 * `RuntimeContextProvider` port — the ch12-C15 model-verbatim base member set
 * stays BYTE-UNTOUCHED. A provider whose contexts execute ON THIS HOST
 * ADDITIONALLY implements it (the worktree provider: from its own minted
 * `locator.path`); a future cloud provider simply does not claim the facet.
 * The loop resolves it at intent-derivation time for a `ready(ref)` run and
 * hands the executor an explicit `cwd` input — so the working directory is a
 * CONTRACT obligation of the provider ("you cannot be a local provider without
 * answering where"), never a value read out of the actor's projection. The
 * returned VALUE is byte-identical to C17's "projected worktree path" (the
 * provider mints both from one source — `locator.path`); only the resolution
 * MECHANISM moves below contract grain.
 */
export interface LocalExecutionCapability {
  /** The absolute local working directory for a provisioned ref (C17). A
   * throwing resolution is D6's config-integrity lane (fail-closed loud at the
   * loop's derivation). */
  resolveLocalWorkingDirectory(ref: RuntimeContextRef): string;
}

/**
 * l0e/ProviderRegistry (packet ch12-p3, PR2; contract:ch12-runtime-core
 * #C16/#C22): the STATIC, INJECTED, PER-CHAPTER registry — a pure lookup by
 * provider name. Injected at the composition root as ONE new required kernel
 * dependency. The PRODUCTION registry was EMPTY at ch12; since ch9-P2 (C6) it
 * carries `pairflow.worktree` (the real worktree provider) — a spec-declaring
 * template now provisions a live worktree or lands FAILED through the ch9
 * channel, no longer `Rejected(runtime_context_provider_unavailable)` at START.
 */
export interface ProviderRegistry {
  resolve(providerName: string): RuntimeContextProvider | null;
}

/**
 * The completion delivered by a provider (via the composition-injected seam)
 * when its async provisioning concludes: ONE `RuntimeContextCompletion` per
 * request — a `ready(ref)` readiness OR a `failed(reason, detail?)` failure
 * (ch9-P1 W3 — the ONE sink carrying both kinds; the seam holds/releases/drains
 * with zero per-kind seam logic).
 */
export type RuntimeContextCompletionSink = (
  instanceId: InstanceId,
  requestId: string,
  completion: RuntimeContextCompletion,
) => void;

/**
 * PR2: build the static injected registry from a fixed member map (own-key
 * lookup; a non-member resolves to `null`). The ch12 EMPTY production registry
 * was a call with no members; since ch9-P2 (C6) the production call carries
 * `{ "pairflow.worktree": <the worktree provider> }` (the shared production
 * helper at the CLI composition roots).
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
