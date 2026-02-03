import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";

export function NowMarker(props: { x: number }) {
  return (
    <View style={[styles.wrap, { left: props.x }]}>
      <Text style={styles.label}>Now</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: "50%",
    transform: [{ translateY: -40 }],
    alignItems: "center",
  },
  label: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: "800",
    marginBottom: 4,
  },
  line: {
    width: 2,
    height: 70,
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
});
