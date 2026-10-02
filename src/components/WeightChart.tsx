import { useMemo, useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { fromISODate } from '../lib/dates';
import { formatKg, type WeightEntry } from '../lib/weight';
import { colors, fonts, radius, shadow, spacing } from '../theme';
import { Body, Muted } from './ui';

const HEIGHT = 210;
const PAD = { top: 18, right: 46, bottom: 26, left: 34 };
const DAY_MS = 86_400_000;

function shortDate(iso: string): string {
  return fromISODate(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

/** Round gridline values around the readings: 3–5 lines, half a kilo apart at least. */
function ticksFor(min: number, max: number): number[] {
  const span = Math.max(max - min, 1);
  const step = [0.5, 1, 2, 5, 10, 20].find((s) => span / s <= 4) ?? 50;
  const from = Math.floor(min / step) * step;
  const to = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = from; v <= to + 1e-9; v += step) ticks.push(Math.round(v * 10) / 10);
  return ticks;
}

/**
 * Body weight over time: one line, a light wash underneath, hairline gridlines.
 * Touching or dragging across it reads out the nearest day.
 */
export function WeightChart({ entries }: { entries: WeightEntry[] }) {
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  const geometry = useMemo(() => {
    if (!width || entries.length === 0) return null;
    const kgs = entries.map((e) => e.kg);
    const ticks = ticksFor(Math.min(...kgs), Math.max(...kgs));
    const yMin = ticks[0];
    const yMax = ticks[ticks.length - 1];
    const plotW = width - PAD.left - PAD.right;
    const plotH = HEIGHT - PAD.top - PAD.bottom;

    const t0 = fromISODate(entries[0].date).getTime();
    const days = (fromISODate(entries[entries.length - 1].date).getTime() - t0) / DAY_MS;
    const x = (date: string) =>
      PAD.left +
      (days === 0 ? plotW / 2 : (((fromISODate(date).getTime() - t0) / DAY_MS) / days) * plotW);
    const y = (kg: number) => PAD.top + (1 - (kg - yMin) / (yMax - yMin || 1)) * plotH;

    const points = entries.map((e) => ({ ...e, x: x(e.date), y: y(e.kg) }));
    const line = points.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
    const bottom = PAD.top + plotH;
    const area =
      points.length > 1
        ? `${line} L${points[points.length - 1].x} ${bottom} L${points[0].x} ${bottom} Z`
        : '';
    return { ticks, y, points, line, area, bottom };
  }, [entries, width]);

  const pick = (event: GestureResponderEvent) => {
    if (!geometry) return;
    const touchX = event.nativeEvent.locationX;
    let best = 0;
    geometry.points.forEach((p, i) => {
      if (Math.abs(p.x - touchX) < Math.abs(geometry.points[best].x - touchX)) best = i;
    });
    setActive(best);
  };

  const first = entries[0];
  const last = entries[entries.length - 1];
  const summary =
    first && last
      ? `Grafico del peso dal ${shortDate(first.date)} al ${shortDate(last.date)}: da ${formatKg(first.kg)} a ${formatKg(last.kg)} chili`
      : 'Grafico del peso';

  const shown = active !== null && geometry ? geometry.points[active] : null;
  const end = geometry?.points[geometry.points.length - 1];

  return (
    <View
      style={styles.root}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityLabel={summary}
    >
      {geometry ? (
        <Svg width={width} height={HEIGHT}>
          {geometry.ticks.map((tick) => (
            <Line
              key={tick}
              x1={PAD.left}
              x2={width - PAD.right + 8}
              y1={geometry.y(tick)}
              y2={geometry.y(tick)}
              stroke={colors.border}
              strokeWidth={StyleSheet.hairlineWidth}
            />
          ))}
          {geometry.ticks.map((tick) => (
            <SvgText
              key={`l${tick}`}
              x={PAD.left - 8}
              y={geometry.y(tick) + 4}
              fontSize={11}
              fontFamily={fonts.body}
              fill={colors.textFaint}
              textAnchor="end"
            >
              {formatKg(tick)}
            </SvgText>
          ))}

          {geometry.area ? <Path d={geometry.area} fill={colors.green} opacity={0.1} /> : null}
          <Path
            d={geometry.line}
            stroke={colors.green}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            fill="none"
          />

          {first ? (
            <SvgText
              x={geometry.points[0].x}
              y={HEIGHT - 6}
              fontSize={11}
              fontFamily={fonts.body}
              fill={colors.textMuted}
              textAnchor={entries.length > 1 ? 'start' : 'middle'}
            >
              {shortDate(first.date)}
            </SvgText>
          ) : null}
          {end && entries.length > 1 ? (
            <SvgText
              x={end.x}
              y={HEIGHT - 6}
              fontSize={11}
              fontFamily={fonts.body}
              fill={colors.textMuted}
              textAnchor="end"
            >
              {shortDate(last.date)}
            </SvgText>
          ) : null}

          {end ? (
            <>
              <Circle cx={end.x} cy={end.y} r={6} fill={colors.surface} />
              <Circle cx={end.x} cy={end.y} r={4.5} fill={colors.green} />
              <SvgText
                x={end.x + 10}
                y={end.y + 4}
                fontSize={12}
                fontFamily={fonts.bodySemi}
                fill={colors.text}
              >
                {formatKg(end.kg)}
              </SvgText>
            </>
          ) : null}

          {shown ? (
            <>
              <Line
                x1={shown.x}
                x2={shown.x}
                y1={PAD.top - 6}
                y2={geometry.bottom}
                stroke={colors.textFaint}
                strokeWidth={1}
              />
              <Circle cx={shown.x} cy={shown.y} r={7} fill={colors.surface} />
              <Circle cx={shown.x} cy={shown.y} r={5} fill={colors.green} />
            </>
          ) : null}
        </Svg>
      ) : null}

      {/* A finger is wider than the line: anywhere on the plot picks the closest day. */}
      <View
        style={StyleSheet.absoluteFill}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={pick}
        onResponderMove={pick}
        onResponderRelease={() => setActive(null)}
        onResponderTerminate={() => setActive(null)}
      />

      {shown ? (
        <View
          pointerEvents="none"
          style={[
            styles.tooltip,
            { left: Math.min(Math.max(shown.x - 56, 0), Math.max(width - 112, 0)) },
          ]}
        >
          <Body style={styles.tooltipValue}>{formatKg(shown.kg)} kg</Body>
          <Muted style={styles.tooltipDate}>{shortDate(shown.date)}</Muted>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { height: HEIGHT },
  tooltip: {
    position: 'absolute',
    top: -spacing.sm,
    width: 112,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    ...shadow.raised,
  },
  tooltipValue: { fontFamily: fonts.bodySemi, fontSize: 15 },
  tooltipDate: { fontSize: 12 },
});
