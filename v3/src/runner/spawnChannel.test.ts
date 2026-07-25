import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { ChannelConclusion } from "./spawnChannel.js";
import { createDirectSpawnChannel } from "./spawnChannel.js";

/**
 * The direct spawn channel (packet ch9-p4a, TX1): a pass-through wrap of
 * `disciplinedSpawn` — the P3b behavior byte-preserved, every conclusion
 * surfaced as `direct-exit` (`name_collision` UNREACHABLE on this channel —
 * RS4(a)'s scoped exclusion carried; the tmux lanes live in
 * `tmuxChannel.test.ts`). Driven against REAL children (this file joins the
 * Stryker subprocess exclude).
 */

const NODE = process.execPath;
const roots: string[] = [];
afterEach(() => {
  for (const dir of roots.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});
function tempRoot(): string {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "v3-channel-")));
  roots.push(root);
  return root;
}

function launchScript(
  script: string,
  overrides: {
    cwd?: string;
    env?: Record<string, string>;
    timeoutMs?: number;
    graceMs?: number;
    backstopMarginMs?: number;
  } = {},
): Promise<ChannelConclusion> {
  return createDirectSpawnChannel().launch({
    wrapperArgv: [NODE, "-e", script],
    cwd: overrides.cwd ?? tempRoot(),
    env: overrides.env ?? { PATH: process.env.PATH ?? "" },
    sessionName: "p4atest-direct-unused",
    timeoutMs: overrides.timeoutMs ?? 30_000,
    graceMs: overrides.graceMs ?? 10_000,
    backstopMarginMs: overrides.backstopMarginMs ?? 5_000,
  });
}

describe("createDirectSpawnChannel — the TX1 pass-through pin", () => {
  it("a real child's exit conclusion passes through VERBATIM as direct-exit", async () => {
    const c = await launchScript("process.stdout.write('out'); process.exit(3)");
    expect(c.kind).toBe("direct-exit");
    if (c.kind !== "direct-exit") return;
    expect(c.conclusion).toMatchObject({
      kind: "exit",
      code: 3,
      signal: null,
      timedOut: false,
      stdout: "out",
    });
  });

  it("cwd and env FULL REPLACEMENT ride through to the seam (host HOME absent)", async () => {
    const dir = tempRoot();
    const c = await launchScript(
      "process.stdout.write(JSON.stringify({ cwd: process.cwd(), FOO: process.env.FOO ?? null, HOME: process.env.HOME ?? null }))",
      { cwd: dir, env: { FOO: "bar" } },
    );
    expect(c.kind).toBe("direct-exit");
    if (c.kind !== "direct-exit" || c.conclusion.kind !== "exit") return;
    const dumped = JSON.parse(c.conclusion.stdout) as { cwd: string; FOO: string; HOME: null };
    expect(realpathSync(dumped.cwd)).toBe(dir);
    expect(dumped.FOO).toBe("bar");
    expect(dumped.HOME).toBeNull();
  });

  it("the seam's own-timer escalation is preserved (timedOut flagged, SIGKILL on a TERM-ignoring child at graceMs + backstopMarginMs)", async () => {
    const c = await launchScript(
      "process.on('SIGTERM', () => {}); setTimeout(() => process.exit(0), 100000)",
      { timeoutMs: 150, graceMs: 100, backstopMarginMs: 100 },
    );
    expect(c.kind).toBe("direct-exit");
    if (c.kind !== "direct-exit" || c.conclusion.kind !== "exit") return;
    expect(c.conclusion.timedOut).toBe(true);
    expect(c.conclusion.signal).toBe("SIGKILL");
  });

  it("a seam INFRA conclusion (ENOENT) ALSO rides direct-exit — the channel never reinterprets", async () => {
    const c = await launchScript("unused", { cwd: tempRoot() });
    const missing = await createDirectSpawnChannel().launch({
      wrapperArgv: [join(tempRoot(), "no-such-binary")],
      cwd: tempRoot(),
      env: { PATH: process.env.PATH ?? "" },
      sessionName: "p4atest-direct-unused",
      timeoutMs: 30_000,
      graceMs: 10_000,
      backstopMarginMs: 5_000,
    });
    expect(c.kind).toBe("direct-exit");
    expect(missing.kind).toBe("direct-exit");
    if (missing.kind !== "direct-exit") return;
    expect(missing.conclusion.kind).toBe("infra");
  });

  it("name_collision is UNREACHABLE on the direct channel (RS4(a) carried): every observed conclusion kind is direct-exit", async () => {
    const conclusions = await Promise.all([
      launchScript("process.exit(0)"),
      launchScript("process.exit(9)"),
      launchScript("process.kill(process.pid, 'SIGTERM')"),
    ]);
    for (const c of conclusions) {
      expect(c.kind).toBe("direct-exit");
    }
  });
});
