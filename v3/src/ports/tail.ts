/**
 * The floor-tail wait seam (plan §6.3, packet ch6-P2): one poll-gap
 * wait between tail rounds. Floor-side ONLY — the kernel's TimeSource
 * is untouched (IC-D). Production binds a real timer (activated with
 * the ch-6 CLI, P4); tests bind the testkit scripted wait. The engine
 * invariant: the tail calls this only after a NON-terminal post-drain
 * status read — once terminal is observed, it never waits again.
 */
export type TailWait = () => Promise<void>;
