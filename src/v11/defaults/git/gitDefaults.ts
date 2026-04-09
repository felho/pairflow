import {
  branchExists as branchExistsCanonical,
  runGit as runGitCanonical
} from "../../infrastructure/workspace/git.js";
import type { BranchExistsPort, RunGitPort } from "../../shared/ports/git.js";

export const runGit: RunGitPort = async (...args) => runGitCanonical(...args);

export const branchExists: BranchExistsPort = async (...args) =>
  branchExistsCanonical(...args);
