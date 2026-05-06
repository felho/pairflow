import type { TmuxRunner } from "../../shared/ports/tmuxSessions.js";

interface TmuxRunnerDefaultsModule {
  runTmux: TmuxRunner;
}

let tmuxRunnerDefaultsModulePromise:
  | Promise<TmuxRunnerDefaultsModule>
  | undefined;

function getTmuxRunnerDefaultsModulePath(): string {
  return "../../defaults/tmux/tmuxRunnerDefaults.js";
}

async function loadTmuxRunnerDefaultsModule():
  Promise<TmuxRunnerDefaultsModule> {
  tmuxRunnerDefaultsModulePromise ??= import(
    getTmuxRunnerDefaultsModulePath()
  ) as Promise<TmuxRunnerDefaultsModule>;
  return tmuxRunnerDefaultsModulePromise;
}

export const runTmux: TmuxRunner = async (...args) => {
  const { runTmux: runTmuxDefault } = await loadTmuxRunnerDefaultsModule();
  return runTmuxDefault(...args);
};
