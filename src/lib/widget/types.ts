/** One chosen food for the day, as the home screen widget sees it. */
export type WidgetItem = {
  mealKey: string;
  categoryId: string;
  meal: string;
  name: string;
  qty: string;
  done: boolean;
};

/** A tick made on the widget that the app has not absorbed yet. */
export type WidgetToggle = {
  date: string;
  mealKey: string;
  categoryId: string;
  done: boolean;
};

/**
 * Everything the widget renders. It must be plain JSON: it lives in the shared
 * app-group defaults and is rewritten by the widget itself when a button is tapped.
 */
export type TodayWidgetProps = {
  /** `YYYY-MM-DD` the items belong to. */
  date: string;
  items: WidgetItem[];
  pending: WidgetToggle[];
};
