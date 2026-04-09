const convergedDependencyDefaultsPromise = import(
  "../../../core/agent/convergedDefaults.js"
).then(({ convergedDependencyDefaults }) => convergedDependencyDefaults);

export const convergedDependencyDefaults = await convergedDependencyDefaultsPromise;
