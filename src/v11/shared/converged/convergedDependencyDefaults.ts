const convergedDependencyDefaultsPromise = import(
  "../../defaults/converged/convergedDependencyDefaults.js"
).then(({ convergedDependencyDefaults }) => convergedDependencyDefaults);

export const convergedDependencyDefaults = await convergedDependencyDefaultsPromise;
