export const reviewerCommandGateRound1 =
  "If review round is 1: do not use `pairflow converged`; use `pairflow pass`.";

export const reviewerCommandGateRound2Clean =
  "If review round is 2 or higher and you have no findings: use `pairflow converged`.";

export const reviewerCommandGateRound2CleanPassForbidden =
  "Do not use `pairflow pass --no-findings` for the clean path in round 2 or higher.";

export const reviewerCommandGateRound2Findings =
  "If review round is 2 or higher and you have findings, keep using `pairflow pass`.";

export const reviewerCommandGateBlockerUnchanged =
  "Blocker-handling policy remains unchanged in this bugfix scope.";
