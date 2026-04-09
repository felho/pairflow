const eventsScanDefaultsPromise = import(
  "../../shared/list/listCommandApi.js"
).then(({ listBubbles }) => listBubbles);

export const listBubbles = await eventsScanDefaultsPromise;
