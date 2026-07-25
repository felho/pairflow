/**
 * The C8 host-safe encoding + the C23 session-name derivation (packet
 * ch9-p3b, T1/RS4(b)). RELOCATED from `providers/worktreeProvider.ts` to the
 * runner plane as the ONE authority: the naming family C8/C17/C23 shares it,
 * and a generic adapter must not value-import a concrete provider module
 * (REV-E's spirit at the module graph). `providers/worktreeProvider.ts` imports
 * `enc` from here; `providers/index.ts` keeps re-exporting it (extend-don't-fork).
 */

/**
 * N2 reference `enc` — the SANITIZING, INJECTIVE, host-safe encoding at
 * UTF-16 CODE-UNIT grain (ids are JS strings and may be ILL-FORMED Unicode).
 * A code unit whose character is `[a-z0-9]` passes through; EVERY other unit
 * (uppercase, `_`, multibyte, lone surrogates included) encodes as `_` + FOUR
 * lowercase hex digits of the unit value. Output alphabet `[a-z0-9_]`:
 * injective over arbitrary JS strings (fixed-width escape, raw chars never
 * `_`), all-lowercase (case-fold-stable on the case-insensitive host), and
 * `-`/`/`/`.` are unexpressible (so the composite `--` and `/` delimiters
 * cannot alias). `\uD800` → `_d800`, `�` → `_fffd` — distinct by
 * construction. enc of a nonempty id is nonempty.
 */
export function enc(id: string): string {
  let out = "";
  for (let i = 0; i < id.length; i += 1) {
    const code = id.charCodeAt(i);
    // Pass-through for lowercase ASCII letters and digits ONLY.
    if ((code >= 0x61 && code <= 0x7a) || (code >= 0x30 && code <= 0x39)) {
      out += id[i];
    } else {
      out += `_${code.toString(16).padStart(4, "0")}`;
    }
  }
  return out;
}

/**
 * RS4(b): the C23 SESSION-NAME derivation as an exported pure function —
 * `"pairflow-" + enc(instanceId) + "--" + enc(attemptId)`. Composition-bound
 * as the loop's `sessionNamer` at ch9-P3b (replacing nothing: P3a injected the
 * seam, this packet supplies the real value); its tmux CONSUMER is the
 * `runner run` composition's tmux channel (CW3, packet ch9-p4b).
 * NAME COMPONENTS never embed raw ids (C8's encoding rule) — the `enc` escapes
 * make `-`/`/`/`.` unexpressible, so the `--` and `pairflow-` delimiters cannot
 * alias across ids.
 */
export function defaultSessionNamer(instanceId: string, attemptId: string): string {
  return `pairflow-${enc(instanceId)}--${enc(attemptId)}`;
}
