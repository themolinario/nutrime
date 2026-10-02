/** `mealKey` + `categoryId` — identifies one pick inside a single day. */
export type SlotKey = string;

export function slotKey(mealKey: string, categoryId: string): SlotKey {
  return `${mealKey}\u0000${categoryId}`;
}
