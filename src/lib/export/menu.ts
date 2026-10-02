import { formatDayMonth, fromISODate, weekdayName } from '../dates';
import { mealsForDate } from '../diet/parse';
import { slotKey, type SlotKey } from '../diet/slots';
import { addedCategoryId, type DayExtras } from '../diet/day';
import type { DietPlan, FoodComponent, ResolvedMeal } from '../diet/types';
import { esc, pdfPage } from './html';

/** One line of a meal: a chosen food (`name`) or a table still to pick (`name: null`). */
type Pick = { category: string; name: string | null; qty: string; components?: FoodComponent[] };
type MealPicks = { key: string; name: string; free: boolean; picks: Pick[] };

/** A small emoji per meal, so chat messages can be scanned at a glance. */
const MEAL_EMOJI: Record<string, string> = {
  colazione: '☕',
  'meta-mattina': '🍎',
  spuntino: '🍎',
  pranzo: '🍝',
  merenda: '🥛',
  'meta-pomeriggio': '🥛',
  cena: '🍽️',
  'dopo-cena': '🌙',
  'spuntino-serale': '🌙',
  'arco-della-giornata': '🫒',
};

function emojiFor(mealKey: string): string {
  return MEAL_EMOJI[mealKey] ?? '•';
}

function collect(
  meals: ResolvedMeal[],
  choices: Record<SlotKey, string> | undefined,
  extras: DayExtras = {},
): MealPicks[] {
  return meals.map((meal) => {
    const planned = meal.categories.map((category): Pick => {
      const slot = slotKey(meal.key, category.id);
      const option = category.options.find((o) => o.id === choices?.[slot]);
      return option
        ? {
            category: category.name,
            name: option.name,
            qty: extras.overrides?.[slot] ?? option.qty.raw,
            components: option.components,
          }
        : { category: category.name, name: null, qty: '' };
    });
    const added = (extras.added?.[meal.key] ?? []).map((food): Pick => ({
      category: addedCategoryId(food.id),
      name: food.name,
      qty: food.qty,
    }));
    return {
      key: meal.key,
      name: meal.name,
      free: meal.free && !added.length,
      picks: [...planned, ...added],
    };
  });
}

function dayTitle(date: string): string {
  return `${weekdayName(date)} ${formatDayMonth(date)}`;
}

/** e.g. `24 – 30 settembre`, or `28 settembre – 11 ottobre` across months. */
export function formatRange(dates: string[]): string {
  const first = dates[0];
  const last = dates[dates.length - 1];
  if (first === last) return formatDayMonth(first);
  const sameMonth = fromISODate(first).getMonth() === fromISODate(last).getMonth();
  return sameMonth
    ? `${fromISODate(first).getDate()} – ${formatDayMonth(last)}`
    : `${formatDayMonth(first)} – ${formatDayMonth(last)}`;
}

/* ── One day ─────────────────────────────────────────────────────────────── */

/**
 * The day's picks as a chat message, using WhatsApp markup (`*bold*`, `_italic_`)
 * so it reads well once pasted there and stays legible anywhere else.
 */
export function buildDayMessage(
  date: string,
  meals: ResolvedMeal[],
  choices: Record<SlotKey, string> | undefined,
  extras?: DayExtras,
): string {
  const body = collect(meals, choices, extras)
    .map((meal) => {
      const lines = meal.free
        ? ['_Pasto libero_']
        : meal.picks.flatMap(({ category, name, qty, components }) =>
            name
              ? [
                  `• ${name} — ${qty}`,
                  ...(components ?? []).map((c) => `   ◦ ${c.name} — ${c.qty.raw}`),
                ]
              : [`• _${category}: da scegliere_`],
          );
      return `${emojiFor(meal.key)} *${meal.name.toUpperCase()}*\n${lines.join('\n')}`;
    })
    .join('\n\n');
  return `🥗 *Menu di ${dayTitle(date)}*\n\n${body}`;
}

const DAY_CSS = `
  section { break-inside: avoid; margin-bottom: 16px; }
  h2 { font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color: #6E7C72; margin: 0 0 6px; }
  ul { list-style: none; margin: 0; padding: 0; }
  li { padding: 7px 0; border-bottom: 1px solid #E7DFD2; }
  li .name { font-size: 14px; }
  li .qty { float: right; font-weight: 600; color: #1F6B4A; font-size: 14px; }
  .sub { margin: 4px 0 0 14px; }
  .sub li { border: 0; padding: 2px 0; }
  .sub .name, .sub .qty { font-size: 12px; color: #6E7C72; font-weight: 400; }
  .todo .name, .free { color: #D2603A; font-style: italic; font-size: 14px; margin: 0; }
`;

/** The same content as {@link buildDayMessage}, laid out as a printable A4 page. */
export function buildDayHtml(
  date: string,
  meals: ResolvedMeal[],
  choices: Record<SlotKey, string> | undefined,
  extras?: DayExtras,
): string {
  const sections = collect(meals, choices, extras)
    .map((meal) => {
      const rows = meal.free
        ? '<p class="free">Pasto libero</p>'
        : `<ul>${meal.picks
            .map(({ category, name, qty, components }) =>
              name
                ? `<li><span class="name">${esc(name)}</span><span class="qty">${esc(qty)}</span>${
                    components?.length
                      ? `<ul class="sub">${components
                          .map(
                            (c) =>
                              `<li><span class="name">${esc(c.name)}</span><span class="qty">${esc(c.qty.raw)}</span></li>`,
                          )
                          .join('')}</ul>`
                      : ''
                  }</li>`
                : `<li class="todo"><span class="name">${esc(category)}: da scegliere</span></li>`,
            )
            .join('')}</ul>`;
      return `<section><h2>${esc(meal.name)}</h2>${rows}</section>`;
    })
    .join('');
  return pdfPage(`Menu di ${dayTitle(date)}`, '', sections, DAY_CSS);
}

/** File name for the exported PDF, e.g. `Menu Martedì 23 settembre.pdf`. */
export function dayPdfName(date: string): string {
  return `Menu ${dayTitle(date)}.pdf`;
}

/* ── Several days ────────────────────────────────────────────────────────── */

/** Extras per date, looked up while building a range. */
export type ExtrasByDate = (date: string) => DayExtras | undefined;

function daysOf(
  plan: DietPlan,
  dates: string[],
  choices: Record<string, Record<SlotKey, string>>,
  extrasFor?: ExtrasByDate,
) {
  return dates.map((date) => ({
    date,
    meals: collect(mealsForDate(plan, date), choices[date], extrasFor?.(date)),
  }));
}

/**
 * The menu of several days as one chat message: a bold heading per day and one
 * line per meal, which keeps two weeks readable in a single WhatsApp bubble.
 */
export function buildRangeMessage(
  plan: DietPlan,
  dates: string[],
  choices: Record<string, Record<SlotKey, string>>,
  extrasFor?: ExtrasByDate,
): string {
  const body = daysOf(plan, dates, choices, extrasFor)
    .map(({ date, meals }) => {
      const anyChosen = meals.some((m) => m.picks.some((p) => p.name));
      const lines = anyChosen
        ? meals.map((meal) => {
            const text = meal.free
              ? '_pasto libero_'
              : meal.picks
                  .map((p) => (p.name ? `${p.name} ${p.qty}` : '_da scegliere_'))
                  .join(', ');
            return `${emojiFor(meal.key)} *${meal.name}:* ${text}`;
          })
        : ['_Menu ancora da scegliere_'];
      return `*${dayTitle(date).toUpperCase()}*\n${lines.join('\n')}`;
    })
    .join('\n\n');
  return `🗓️ *Menu ${formatRange(dates)}*\n_${dates.length} giorni_\n\n${body}`;
}

const RANGE_CSS = `
  .day { break-inside: avoid; margin-bottom: 14px; border: 1px solid #E7DFD2; border-radius: 10px; overflow: hidden; }
  .day h2 { margin: 0; padding: 8px 12px; font-size: 14px; background: #F3ECE0; color: #14432F; }
  .day h2 span { font-weight: 400; color: #6E7C72; font-size: 12px; margin-left: 6px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 6px 12px; font-size: 12.5px; vertical-align: top; border-top: 1px solid #F0E9DD; }
  td.meal { width: 26%; color: #6E7C72; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; font-weight: 600; padding-top: 8px; }
  .qty { color: #1F6B4A; font-weight: 600; white-space: nowrap; }
  .todo, .free { color: #D2603A; font-style: italic; }
  .sep { color: #D6CBB8; padding: 0 4px; }
`;

/** Several days as a printable A4 document, one card per day. */
export function buildRangeHtml(
  plan: DietPlan,
  dates: string[],
  choices: Record<string, Record<SlotKey, string>>,
  extrasFor?: ExtrasByDate,
): string {
  const cards = daysOf(plan, dates, choices, extrasFor)
    .map(({ date, meals }) => {
      const rows = meals
        .map((meal) => {
          const cell = meal.free
            ? '<span class="free">Pasto libero</span>'
            : meal.picks
                .map((p) =>
                  p.name
                    ? `${esc(p.name)} <span class="qty">${esc(p.qty)}</span>`
                    : `<span class="todo">${esc(p.category)}: da scegliere</span>`,
                )
                .join('<span class="sep">·</span>');
          return `<tr><td class="meal">${esc(meal.name)}</td><td>${cell}</td></tr>`;
        })
        .join('');
      return `<div class="day"><h2>${esc(weekdayName(date))}<span>${esc(formatDayMonth(date))}</span></h2><table>${rows}</table></div>`;
    })
    .join('');
  return pdfPage(`Menu ${formatRange(dates)}`, `${dates.length} giorni`, cards, RANGE_CSS);
}

export function rangePdfName(dates: string[]): string {
  return `Menu ${formatRange(dates)}.pdf`;
}
