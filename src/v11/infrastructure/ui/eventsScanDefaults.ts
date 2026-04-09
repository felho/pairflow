const eventsScanDefaultsPromise = import(
  "../../../core/bubble/listBubbles.js"
).then(({ listBubbles }) => listBubbles);

export const listBubbles = await eventsScanDefaultsPromise;
