const stopCommandDefaultsPromise = import(
  "../../defaults/stop/stopCommandDefaults.js"
).then(({ stopBubbleDependencyDefaults }) => stopBubbleDependencyDefaults);

export const stopCommandDefaults = await stopCommandDefaultsPromise;
