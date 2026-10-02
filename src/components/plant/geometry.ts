/**
 * The plant's drawing lives in a 240 × 300 box: the pot at the bottom, the
 * soil at y 216, the plant growing above it (see species.tsx).
 */
export const BOX = { width: 240, height: 300 } as const;

/** Around where a grown plant tops out: the celebration's sparkles gather here. */
export const TOP = { x: 120, y: 64 } as const;
