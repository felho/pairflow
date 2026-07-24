import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Source-hygiene gate (ch11 boundary review verdict 1, 2026-07-18).
 *
 * Born from the P4 NUL-byte incident: a build agent wrote two LITERAL
 * NUL bytes into a string literal (instead of the `\u0000` escape),
 * which flipped the file into the BINARY class — line-oriented greps
 * then silently skipped or mismeasured it, blinding three independent
 * review rounds. The fix class is mechanical: no source file may carry
 * raw control bytes. Escapes (`\u0000`, `\t` as source text) are
 * untouched — only the RAW bytes are banned.
 */

const SRC_ROOT = join(process.cwd(), "src");
/** Raw bytes legal in source text: tab (0x09), LF (0x0A), CR (0x0D). */
const LEGAL_CONTROL = new Set([0x09, 0x0a, 0x0d]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      walk(path, out);
    } else if (/\.(ts|mts|cts|mjs|tsx|json|yaml|yml)$/.test(entry)) {
      out.push(path);
    }
  }
  return out;
}

function controlByteSites(bytes: Buffer): readonly { offset: number; byte: number }[] {
  const sites: { offset: number; byte: number }[] = [];
  for (let i = 0; i < bytes.length; i += 1) {
    const byte = bytes[i] as number;
    if ((byte < 0x20 && !LEGAL_CONTROL.has(byte)) || byte === 0x7f) {
      sites.push({ offset: i, byte });
    }
  }
  return sites;
}

describe("drift — source hygiene (no raw control bytes in source files)", () => {
  it("every v3 source file is free of raw control bytes (NUL included)", () => {
    const offenders: string[] = [];
    for (const path of walk(SRC_ROOT)) {
      const sites = controlByteSites(readFileSync(path));
      if (sites.length > 0) {
        const shown = sites
          .slice(0, 3)
          .map((s) => `0x${s.byte.toString(16).padStart(2, "0")}@${String(s.offset)}`)
          .join(", ");
        offenders.push(`${path} — ${String(sites.length)} raw control byte(s): ${shown}`);
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("the sensitivity probe: a NUL-bearing buffer IS caught by the scanner", () => {
    const hostile = Buffer.from("const key = `a\u0000b`;", "utf-8");
    expect(controlByteSites(hostile)).toHaveLength(1);
  });
});
