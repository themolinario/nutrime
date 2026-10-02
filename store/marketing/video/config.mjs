// Timing of the preview video, shared by build.mjs (pictures) and audio.mjs (sound).
export const FPS = 30;
export const W = 886;
export const H = 1920;
export const INTRO = 2.4;
export const OUTRO = 2.6;
export const XF = 0.4; // transition length

/*
 * Scenes in order. `cuts` are the moments of each raw recording worth showing
 * (seconds): they're joined with hard cuts and fitted to `dur`. The phone pushes
 * in from `zoom[0]` to `zoom[1]` around `focus` (0 top … 1 bottom of the phone),
 * enters from `from` (-1 left, 0 below, 1 right) and starts tilted by `tilt`°.
 */
export const SCENES = [
  { id: 'a', file: 'a-oggi.mov', dur: 4.2, cuts: [[11.6, 13.4], [19.6, 21.2], [29.6, 32.2], [38.2, 41.0]], zoom: [1.0, 1.06], focus: 0.3, from: 0, tilt: -5 },
  { id: 'e', file: 'e-pianta.mov', dur: 4.8, cuts: [[7.6, 12.3], [19.4, 21.4]], zoom: [1.0, 1.14], focus: 0.42, from: 0, tilt: 0, pop: true },
  { id: 'f', file: 'f-peso.mov', dur: 4.4, cuts: [[11.2, 12.9], [14.0, 15.4], [16.0, 17.0], [17.6, 20.8]], zoom: [1.0, 1.1], focus: 0.62, from: 1, tilt: 4 },
  { id: 'b', file: 'b-scegli.mov', dur: 3.8, cuts: [[9.4, 11.6], [14.3, 17.8]], zoom: [1.0, 1.06], focus: 0.5, from: 0, tilt: -3 },
  { id: 'c', file: 'c-settimana.mov', dur: 4.2, cuts: [[12.8, 14.2], [18.6, 21.6], [22.0, 26.0]], zoom: [1.0, 1.05], focus: 0.3, from: -1, tilt: -4 },
  { id: 'd', file: 'd-spesa.mov', dur: 4.0, cuts: [[7.2, 9.0], [12.6, 15.6], [16.3, 18.0], [20.4, 21.6]], zoom: [1.0, 1.06], focus: 0.35, from: 1, tilt: 3 },
];
export const TRANSITIONS = ['zoomin', 'circleopen', 'slideleft', 'smoothup', 'slideright', 'slideleft', 'fadeblack'];

/** When each part (intro, scenes, outro) starts in the final video, transitions overlapping. */
export function partStarts() {
  const durations = [INTRO, ...SCENES.map((s) => s.dur), OUTRO];
  const starts = [0];
  for (let i = 1; i < durations.length; i++) starts.push(starts[i - 1] + durations[i - 1] - XF);
  return { starts, total: starts.at(-1) + OUTRO };
}
