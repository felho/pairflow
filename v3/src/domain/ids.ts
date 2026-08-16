/**
 * Identifier vocabulary — plain string aliases, no branding (the ports/
 * culture: IdempotencyKey = string). Packet ch4-P1 contract matrix.
 */
export type InstanceId = string;
export type OpId = string;
export type StepId = string;
export type RoleName = string;
/** Navigation vocabulary (PASS / CONVERGED …) is template DATA, not an enum. */
export type EventType = string;
export type ActorId = string;
/**
 * ch13v2-C2/C13: a context-block id — ONE namespace over the catalog's
 * keys and every ref-list member alike (the grammar is the declaration's,
 * `[vc-block-id]`). It is minted HERE rather than beside the catalog
 * because `domain/template.ts` already type-imports the gate binding from
 * `domain/gate.ts`, and typing the binding's ref list from a template-side
 * alias would invert that edge into an import cycle inside `domain/`.
 */
export type BlockId = string;
/**
 * ch14-C4: a gate's decision key — DATA the kernel never interprets
 * (routing is by declared key through the one shared arrival; lifecycle
 * meaning comes from the TARGET's type). It joins the one id namespace,
 * ch14-C10's ban included, because it feeds record enumeration.
 */
export type DecisionKey = string;
/**
 * ch14-C3: an AUTHORED bare-wait kind. The kernel's own enumerable kind
 * set stays kernel-owned beside this open authored class — a collision
 * with it is refused at admission.
 */
export type WaitKind = string;
