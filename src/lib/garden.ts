import type { IconName } from '../components/Icon';

/**
 * The greenhouse: the plants the user can grow, one at a time. Each one takes
 * a number of complete days in a row, roughly in proportion to how long it
 * takes for real (from a week for watercress to the slow olive tree), and
 * goes to the greenhouse once grown. The days count only for the plant they
 * were spent on: switching plant starts over from a seed.
 */

export type SpeciesId =
  | 'crescione'
  | 'ravanello'
  | 'basilico'
  | 'calendula'
  | 'fragola'
  | 'girasole'
  | 'peperoncino'
  | 'pomodoro'
  | 'lavanda'
  | 'ulivo';

/** The show put on when a plant is grown. */
export type SpecialShow = 'butterflies' | 'rainbow' | 'stars';

export type Species = {
  id: SpeciesId;
  name: string;
  /** Complete days in a row from seed to greenhouse. */
  days: number;
  /** Plants to have grown at least once before this one can be sown. */
  requires: SpeciesId[];
  /** How long it takes in a real garden, which `days` follows in proportion. */
  real: string;
  blurb: string;
  /** Title of the celebration once grown. */
  grownTitle: string;
  icon: IconName;
  show: SpecialShow;
};

export const SPECIES: Species[] = [
  {
    id: 'crescione',
    name: 'Crescione',
    days: 5,
    requires: [],
    real: 'Nell’orto: pronto in 7–10 giorni',
    blurb: 'Germoglia in due giorni: il più rapido per cominciare.',
    grownTitle: 'Crescione pronto!',
    icon: 'leaf',
    show: 'rainbow',
  },
  {
    id: 'ravanello',
    name: 'Ravanello',
    days: 7,
    requires: [],
    real: 'Nell’orto: 25–30 giorni',
    blurb: 'Sotto terra si gonfia una radice rossa e croccante.',
    grownTitle: 'Ravanello raccolto!',
    icon: 'leaf',
    show: 'rainbow',
  },
  {
    id: 'basilico',
    name: 'Basilico',
    days: 10,
    requires: [],
    real: 'Nell’orto: 4–6 settimane',
    blurb: 'Foglie larghe e profumate, da cogliere una a una.',
    grownTitle: 'Che profumo!',
    icon: 'leaf',
    show: 'butterflies',
  },
  {
    id: 'calendula',
    name: 'Calendula',
    days: 14,
    requires: ['crescione'],
    real: 'Nell’orto: fiorisce in 7–8 settimane',
    blurb: 'Un fiore arancione che non smette di sbocciare.',
    grownTitle: 'La calendula è fiorita!',
    icon: 'flower',
    show: 'butterflies',
  },
  {
    id: 'fragola',
    name: 'Fragola',
    days: 18,
    requires: ['ravanello'],
    real: 'Nell’orto: un mese dal fiore al frutto',
    blurb: 'Prima un fiorellino bianco, poi le fragole rosse.',
    grownTitle: 'Fragole mature!',
    icon: 'cherries',
    show: 'rainbow',
  },
  {
    id: 'girasole',
    name: 'Girasole',
    days: 21,
    requires: ['calendula'],
    real: 'Nell’orto: 10–12 settimane',
    blurb: 'Insegue il sole per settimane, poi apre il suo faccione.',
    grownTitle: 'Il girasole è sbocciato!',
    icon: 'sunny-outline',
    show: 'rainbow',
  },
  {
    id: 'peperoncino',
    name: 'Peperoncino',
    days: 25,
    requires: ['basilico'],
    real: 'Nell’orto: 3–4 mesi',
    blurb: 'Parte lento e ama il caldo, poi si riempie di cornetti.',
    grownTitle: 'Peperoncini rossi!',
    icon: 'flame',
    show: 'stars',
  },
  {
    id: 'pomodoro',
    name: 'Pomodoro',
    days: 30,
    requires: ['fragola', 'peperoncino'],
    real: 'Nell’orto: 3–4 mesi dal seme',
    blurb: 'Fiori gialli, grappoli verdi, poi rossi e succosi.',
    grownTitle: 'Pomodori maturi!',
    icon: 'nutrition-outline',
    show: 'butterflies',
  },
  {
    id: 'lavanda',
    name: 'Lavanda',
    days: 45,
    requires: ['girasole'],
    real: 'Nell’orto: piena fioritura al secondo anno',
    blurb: 'Paziente e profumata: le spighe viola arrivano col tempo.',
    grownTitle: 'La lavanda è in fiore!',
    icon: 'flower',
    show: 'butterflies',
  },
  {
    id: 'ulivo',
    name: 'Ulivo',
    days: 60,
    requires: ['pomodoro'],
    real: 'Nell’orto: le prime olive dopo 3–5 anni',
    blurb: 'Il più paziente di tutti, e il più longevo.',
    grownTitle: 'Le prime olive!',
    icon: 'sparkles',
    show: 'stars',
  },
];

const BY_ID = new Map(SPECIES.map((s) => [s.id, s]));

export function speciesOf(id: SpeciesId): Species {
  return BY_ID.get(id) ?? SPECIES[0];
}

/** The plant being grown, and the first day that counts for it. */
export type Growing = { species: SpeciesId; since: string };

export type Garden = {
  growing: Growing | null;
  /** Every plant grown to the end, oldest first. */
  grown: { species: SpeciesId; on: string }[];
};

export const EMPTY_GARDEN: Garden = { growing: null, grown: [] };

/** How many times each plant has been grown. */
export function grownCount(garden: Garden): Partial<Record<SpeciesId, number>> {
  const out: Partial<Record<SpeciesId, number>> = {};
  for (const { species } of garden.grown) out[species] = (out[species] ?? 0) + 1;
  return out;
}

/** The plants still to grow before `species` can be sown; empty once it's unlocked. */
export function missingFor(species: Species, garden: Garden): Species[] {
  const count = grownCount(garden);
  return species.requires.filter((id) => !count[id]).map(speciesOf);
}

/**
 * Growth to draw, from 0 (bare soil) to 5 (grown): the first day sprouts it,
 * the bud shows on the last day before the end, and the days in between share
 * out the rest, so a long plant grows a little every day.
 */
export function growOf(progress: number, days: number): number {
  if (progress <= 0) return 0;
  if (progress >= days) return 5;
  return 1 + (3 * (progress - 1)) / Math.max(1, days - 2);
}
