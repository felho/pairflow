const stopCommandDefaultsPromise = import(
  "../../../core/bubble/stopBubbleDefaults.js"
).then(({ stopBubbleDependencyDefaults }) => stopBubbleDependencyDefaults);

export const stopCommandDefaults = await stopCommandDefaultsPromise;
