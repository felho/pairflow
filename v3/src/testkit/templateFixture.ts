import type { AdmittedTemplate, TemplateRef, WorkflowTemplate } from "../domain/index.js";
import type { DefinitionStore } from "../ports/definition.js";

/**
 * MD-1 RETIRED at ch8-P2 (2026-07-11): the canonical authoring file
 * `v3/templates/local-pair-v0@1.yaml` is the SINGLE source of this
 * template. This fixture STAYS for the kit's own consumers and is
 * equality-pinned to the canonical file's parsed form FROM TESTS
 * (`templateFixture.test.ts` — the kit itself never imports
 * `definition/`; the ADR-005 stance is untouched).
 *
 * Shape: the model's local-pair-v0 — implement ⇄ review with PASS
 * navigation, and since ch14-p3b the CONVERGED edge parks at the
 * `human_approval` gate, whose approve route waits at `commit_pending`
 * for a COMMIT before `done`. Defaults implementer→codex,
 * reviewer→claude, operator→human.
 *
 * ch11-P4 (Y2): the `round` declaration is carried HERE together with
 * the shipped `local-pair-v0@1.yaml` (Y1) — the model's own exhibited
 * declaration (advance on arrival at the start step). Both gain it in
 * the SAME commit so the ch8-P2 equality pin holds with ZERO edits to
 * the pin test; a one-sided edit is mechanically red.
 */
export function fixtureTemplate(): WorkflowTemplate {
  return {
    ref: { id: "local-pair-v0", version: 1 },
    start: "implement",
    steps: {
      implement: {
        role: "implementer",
        instruction: "build it",
        transitions: { PASS: "review" },
      },
      review: {
        role: "reviewer",
        instruction: "review it",
        transitions: { PASS: "implement", CONVERGED: "human_approval" },
        recommends: { CONVERGED: "approve" },
      },
      // ch14-p3b (T3/T4): the DIRECT channel spells the step class in its
      // STORED form — `human_gate`, never the file channel's `humanGate`.
      human_approval: {
        type: "human_gate",
        role: "operator",
        instruction: "The reviewer has converged. Decide how this run continues.",
        decisions: {
          approve: { target: "commit_pending" },
          request_rework: {
            target: "implement",
            payload: { instruction: { required: true }, refs: { required: false } },
          },
        },
      },
      commit_pending: {
        type: "wait",
        wait: { kind: "commit_pending", resumeEvents: ["COMMIT"] },
        onResume: { COMMIT: "done" },
      },
    },
    terminal: ["done"],
    roles: {
      implementer: {
        defaultActor: "codex",
        defaultAgentConfig: { promptConcernRefs: ["emit-envelope"] },
      },
      reviewer: {
        defaultActor: "claude",
        defaultAgentConfig: { promptConcernRefs: ["emit-envelope"] },
      },
      // A role that never dispatches has no agent config to default, so
      // `defaultAgentConfig` is omitted — which is what makes the shipped
      // `emit-envelope` block role-ASYMMETRIC for the first time.
      operator: { defaultActor: "human" },
    },
    round: { advanceOnArrivalAt: ["implement"] },
    contextBlocks: { "emit-envelope": { body: EMIT_ENVELOPE_BODY } },
  };
}

/**
 * ch13-p1b (ch13v2-C16/C17): the shipped catalog's first entry, carried
 * HERE together with the canonical `local-pair-v0@1.yaml` — the ch8-P2
 * equality pin compares the two at the ADMITTED stage, so both gain the
 * catalog and BOTH role refs in the SAME commit and the pin test itself
 * is edited zero times (the ch11-P4 / ch12-P4 shape). Since ch14-p3b the
 * block is role-ASYMMETRIC: the `operator` role never dispatches, so it
 * references no block, and only the two ACTOR roles do.
 *
 * The body is authored static text delivered without transformation;
 * the surface defines no interpolation syntax and reserves none, so the
 * literal braces below are ordinary prose.
 */
const EMIT_ENVELOPE_BODY = [
  "How to emit an operation.",
  "",
  "Your dispatch packet is a JSON file; its path is in the",
  "PAIRFLOW_PACKET environment variable. It carries your task,",
  "your instruction, and availableOps — the operation types",
  "this step can move on.",
  "",
  "To emit, write ONE JSON object to the path in the",
  "PAIRFLOW_EMIT environment variable, with EXACTLY two keys:",
  "",
  '  { "type": "<one of availableOps>", "payload": <your result> }',
  "",
  "Nothing else is read. Extra keys, a missing payload, or an",
  "unparseable file are taken as producing NO OUTPUT AT ALL —",
  "silently, with nothing to correct. A well-formed emit can",
  "still be rejected — the type may not be in availableOps, or",
  "your role may not be authorized to emit it here — and the",
  "rejection says which.",
].join("\n");

/**
 * In-memory pinned DefinitionStore fixture: loads exactly the
 * { id, version } asked, nothing else — the "separate store; pinned
 * immutable version" seam without a persistence substrate.
 *
 * NARROWS to AdmittedTemplate (ch11-P2a, T1/C20): the store's only
 * output is the admitted form. The kit itself never imports definition/
 * (ADR-005) — TESTS admit-wrap a raw `fixtureTemplate()` through
 * `admitTemplate` + a catalog and hand the branded value here.
 */
export function fixtureDefinitionStore(
  ...templates: readonly AdmittedTemplate[]
): DefinitionStore {
  const byRef = new Map<string, AdmittedTemplate>(
    templates.map((template) => [refKey(template.ref), template]),
  );
  return {
    load(ref: TemplateRef): Promise<AdmittedTemplate | null> {
      return Promise.resolve(byRef.get(refKey(ref)) ?? null);
    },
  };
}

function refKey(ref: TemplateRef): string {
  return `${ref.id}@${String(ref.version)}`;
}
