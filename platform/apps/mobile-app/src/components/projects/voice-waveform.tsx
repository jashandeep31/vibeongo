import { type RefObject, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

const SAMPLE_INTERVAL_MS = 120;
const BAR_WIDTH = 2;
const BAR_GAP = 2;
const MIN_BAR_HEIGHT = 3;
const MAX_BAR_HEIGHT = 26;
// The meter is in dBFS: about -160 for silence up to 0 at full scale. Speech
// sits roughly between -50 and -10, so that range maps to the bar height.
const FLOOR_DB = -50;

function levelFromMetering(metering: number) {
  return Math.min(Math.max((metering - FLOOR_DB) / -FLOOR_DB, 0), 1);
}

// Scrolling waveform of the live mic level: the newest sample enters on the
// right. Polls the meter on its own so the composer doesn't re-render every
// sample.
export function VoiceWaveform({
  color,
  meter,
}: {
  color: string;
  meter: RefObject<number>;
}) {
  const [barCount, setBarCount] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);

  useEffect(() => {
    if (!barCount) return;
    const interval = setInterval(() => {
      setLevels((previous) => {
        const last = previous.at(-1) ?? 0;
        // Ease toward the new reading so bars don't jitter between samples.
        const next = last * 0.35 + levelFromMetering(meter.current) * 0.65;
        return [...previous, next].slice(-barCount);
      });
    }, SAMPLE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [barCount, meter]);

  const padding = Math.max(barCount - levels.length, 0);

  return (
    <View
      accessibilityLabel="Recording"
      onLayout={(event) =>
        setBarCount(
          Math.floor(
            (event.nativeEvent.layout.width + BAR_GAP) / (BAR_WIDTH + BAR_GAP),
          ),
        )
      }
      style={styles.waveform}
    >
      {Array.from({ length: padding }, (_, index) => (
        <View
          key={`pad-${index}`}
          style={[styles.bar, { backgroundColor: color, opacity: 0.35 }]}
        />
      ))}
      {levels.map((level, index) => (
        <View
          key={index}
          style={[
            styles.bar,
            {
              backgroundColor: color,
              height: MIN_BAR_HEIGHT + level * (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT),
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderRadius: BAR_WIDTH / 2,
    height: MIN_BAR_HEIGHT,
    width: BAR_WIDTH,
  },
  waveform: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: BAR_GAP,
    height: MAX_BAR_HEIGHT,
    minWidth: 0,
    overflow: "hidden",
  },
});
