import { runGit as runGitCanonical } from "../../infrastructure/workspace/git.js";
import type { RunGitPort } from "../../shared/ports/git.js";

export const runGit: RunGitPort = async (...args) => runGitCanonical(...args);
