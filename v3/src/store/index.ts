// SQLite StorePort implementation + schema. Kernel-owned, host-local
// authority: no direct DB access outside this module (ADR-003).
// IC-A1 uniqueness, IC-C commit-boundary timestamps; driver: ADR-006.
export { openStore } from "./sqliteStore.js";
export type { StoreHandle } from "./sqliteStore.js";
