

import { track } from '../analytics';
import { useDietStore } from '../store/useDietStore';
import { mealsForDate } from './parse';
import { slotKey } from './slots';
import { showDialog } from '../dialog';

/**
 * How many real picks the days already have. Tables with a single food are
 * filled by the app on its own, so they do not count as the user's work.
 */
function countPicks(dates: string[]): number {
  const { plan, choices } = useDietStore.getState();
  if (!plan) return 0;
  let picks = 0;
  for (const date of dates) {
    for (const meal of mealsForDate(plan, date)) {
      for (const category of meal.categories) {
        if (category.options.length > 1 && choices[date]?.[slotKey(meal.key, category.id)]) {
          picks += 1;
        }
      }
    }
  }
  return picks;
}

/**
 * "Compila" / "Rigenera" with a safety net: when some foods are already picked
 * it asks first, so a tap never wipes choices by surprise.
 *
 * `overwrite` is what the button means when everything is chosen ("Rigenera").
 */
export function confirmAutoFill(dates: string[], overwrite: boolean) {
  const picks = countPicks(dates);
  const scopeName = dates.length === 1 ? 'day' : 'range';
  const run = (
    mode: 'fill' | 'regenerate' | 'fill_missing' | 'redo_all',
    overwriteAll: boolean,
  ) => {
    useDietStore.getState().autoFill(dates, { overwrite: overwriteAll });
    track('autofill', { scope: scopeName, days: dates.length, mode, had_picks: picks });
  };
  const cancel = () => track('autofill_cancelled', { scope: scopeName, overwrite });
  if (picks === 0) {
    run('fill', overwrite);
    return;
  }

  const scope = dates.length === 1 ? 'di questo giorno' : `di questi ${dates.length} giorni`;
  const keepEaten = 'Gli alimenti già spuntati restano come sono.';

  if (overwrite) {
    showDialog(
      'Rigenerare le scelte?',
      `Le scelte ${scope} verranno sostituite con nuove proposte. ${keepEaten}`,
      [
        { text: 'Annulla', style: 'cancel', onPress: cancel },
        { text: 'Rigenera', style: 'destructive', onPress: () => run('regenerate', true) },
      ],
    );
    return;
  }

  showDialog(
    'Alcune scelte sono già fatte',
    `Hai già scelto ${picks} ${picks === 1 ? 'alimento' : 'alimenti'} ${scope}. Vuoi completare solo quelli mancanti o rifare tutto?`,
    [
      { text: 'Annulla', style: 'cancel', onPress: cancel },
      { text: 'Rifai tutto', style: 'destructive', onPress: () => run('redo_all', true) },
      { text: 'Solo i mancanti', onPress: () => run('fill_missing', false) },
    ],
  );
}
