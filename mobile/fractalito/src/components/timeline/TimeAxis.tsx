import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";
import { formatHour, formatDateLabel } from "../../utils/time";

export function TimeAxis(props: {
  hours: number[];
  hoursStart: number;
  pxPerHour: number;
  screenWidth: number;
  selectedDate: Date;
}) {
  return (
    <View style={styles.container}>
      {/* Axis line */}
      <View style={styles.axisLine} />

      {/* Tick marks + labels */}
      {props.hours.map((h) => {
        const x = (h - props.hoursStart) * props.pxPerHour;
        return (
          <View key={h} style={[styles.tickWrap, { left: x }]}>
            <View style={styles.tick} />
            <Text style={styles.tickLabel}>{formatHour(h)}</Text>
          </View>
        );
      })}

      {/* Date label near middle */}
      <View style={[styles.dateWrap, { left: props.screenWidth / 2 - 110 }]}>
        <Text style={styles.dateText}>{formatDateLabel(props.selectedDate)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center" },
  axisLine: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    height: 1,
    backgroundColor: colors.axis,
  },
  tickWrap: {
    position: "absolute",
    top: "50%",
    transform: [{ translateY: -10 }],
    width: 60,
    alignItems: "center",
  },
  tick: { width: 1, height: 14, backgroundColor: colors.tick },
  tickLabel: { marginTop: 6, fontSize: 12, color: colors.mutedText },

  dateWrap: {
    position: "absolute",
    top: "50%",
    transform: [{ translateY: 24 }],
    width: 220,
    alignItems: "center",
  },
  dateText: { fontSize: 13, color: colors.mutedText },
});
