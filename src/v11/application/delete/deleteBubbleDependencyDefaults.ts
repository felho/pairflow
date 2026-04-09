const deleteBubbleDependencyDefaultsPromise = import(
  "../../../core/bubble/deleteBubbleDefaults.js"
).then(({ deleteBubbleDependencyDefaults }) => deleteBubbleDependencyDefaults);

export const deleteBubbleDependencyDefaults =
  await deleteBubbleDependencyDefaultsPromise;
