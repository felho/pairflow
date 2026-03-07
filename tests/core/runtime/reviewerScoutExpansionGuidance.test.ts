import { describe, expect, it } from "vitest";

import {
  buildReviewerPassOutputContractGuidance,
  buildReviewerScoutExpansionWorkflowGuidance
} from "../../../src/core/runtime/reviewerScoutExpansionGuidance.js";

const branchRangeAnchor = /(<revA>\.\.<revB>|main\.\.HEAD)/;
const historyLogAnchor = /git\s+(log|show)\s+--name-status/;
const worktreeAnchor = /git diff --name-status/;
const fallbackAnchor = /(cannot be resolved reliably|avoid numeric file-operation claims)/i;

describe("reviewer scout expansion diff-scope guardrails", () => {
  it("hardens scout workflow guidance with forbidden sources and required worktree source", () => {
    const guidance = buildReviewerScoutExpansionWorkflowGuidance();

    expect(guidance).toContain(
      "Summary scope guardrail: scope statements must cover only current worktree changes."
    );
    expect(guidance).toContain(
      "For summary scope claims, do not use branch-range diffs such as `git diff <revA>..<revB>` (including `git diff main..HEAD`)."
    );
    expect(guidance).toContain(
      "Do not derive summary scope from history/log sources such as `git log --name-status` or `git show --name-status`."
    );
    expect(guidance).toContain(
      "Establish scope from current worktree changes using `git diff --name-status` + `git diff --cached --name-status` + `git ls-files --others --exclude-standard` (staged, unstaged, and untracked)."
    );
    expect(guidance).toContain(
      "If current worktree scope cannot be resolved reliably, avoid numeric file-operation claims."
    );
    expect(guidance).toMatch(branchRangeAnchor);
    expect(guidance).toMatch(historyLogAnchor);
    expect(guidance).toMatch(worktreeAnchor);
    expect(guidance).toMatch(fallbackAnchor);
    expect(guidance).not.toContain(
      "For summary scope claims, do not use `git diff main..HEAD` or any branch-range diff (`<revA>..<revB>`)."
    );
    expect(guidance).not.toContain(
      "Establish scope with `git diff HEAD --name-status` + `git ls-files --others --exclude-standard` (staged, unstaged, and untracked), or with the combined trio `git diff --name-status` + `git diff --cached --name-status` + `git ls-files --others --exclude-standard`."
    );
  });

  it("narrows scope_covered to current worktree changes only in PASS contract guidance", () => {
    const guidance = buildReviewerPassOutputContractGuidance();

    expect(guidance).toContain(
      "`Scout Coverage.scope_covered` must describe current worktree changes only"
    );
    expect(guidance).toContain(
      "Do not justify `scope_covered` with branch-range diffs such as `git diff <revA>..<revB>` (including `git diff main..HEAD`)."
    );
    expect(guidance).toContain(
      "Do not justify `scope_covered` with history/log sources such as `git log --name-status` or `git show --name-status`."
    );
    expect(guidance).toContain(
      "grounded in `git diff --name-status` + `git diff --cached --name-status` + `git ls-files --others --exclude-standard`."
    );
    expect(guidance).toMatch(branchRangeAnchor);
    expect(guidance).toMatch(historyLogAnchor);
    expect(guidance).toMatch(worktreeAnchor);
    expect(guidance).not.toContain(
      "Do not justify `scope_covered` with `git diff main..HEAD` or any branch-range diff (`<revA>..<revB>`)."
    );
    expect(guidance).not.toContain(
      "`Scout Coverage.scope_covered` must cover only current worktree changes, grounded in `git diff HEAD --name-status` + `git ls-files --others --exclude-standard` or the combined trio `git diff --name-status` + `git diff --cached --name-status` + `git ls-files --others --exclude-standard`."
    );
    expect(guidance).not.toContain(
      "Use `git diff main..HEAD` to justify `scope_covered`."
    );
    expect(guidance).not.toContain(
      "Use `git log --name-status` to justify `scope_covered`."
    );
    expect(guidance).not.toContain(
      "Use `git show --name-status` to justify `scope_covered`."
    );
    expect(guidance).not.toContain(
      "`Scout Coverage.scope_covered` must describe branch-history changes"
    );
  });

  it("keeps unresolved and unavailable diff fallback semantics explicit", () => {
    const guidance = buildReviewerScoutExpansionWorkflowGuidance();

    expect(guidance).toContain("cannot be resolved reliably");
    expect(guidance).toContain("avoid numeric file-operation claims");
    expect(guidance).toMatch(fallbackAnchor);
  });
});
