const passWorkspaceContextDefaultsPromise = import(
  "../../../core/bubble/passWorkspaceContextDefaults.js"
).then(({ passWorkspaceContextDefaults }) => passWorkspaceContextDefaults);

export const passWorkspaceContextDefaults =
  await passWorkspaceContextDefaultsPromise;
