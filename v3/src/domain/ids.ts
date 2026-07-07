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
