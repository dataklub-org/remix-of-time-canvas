import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

export function BottomControls(props: {
  onZoomOut: () => void;
  onZoomIn: () => void;
  zoomLabel: string;
  onJumpToNow: () => void;
}) {
  return (
    <View style={styles.bar}>
      <Pressable onPress={props.onZoomOut} style={styles.controlBtn}>
        <Text style={styles.controlText}>−</Text>
      </Pressable>

      <View style={styles.zoomPill}>
        <Text style={styles.zoomText}>{props.zoomLabel}</Text>
      </View>

      <Pressable onPress={props.onZoomIn} style={styles.controlBtn}>
        <Text style={styles.controlText}>+</Text>
      </Pressable>

      <Pressable onPress={props.onJumpToNow} style={styles.jumpNowBtn}>
        <Text style={styles.jumpNowText}>Jump to Now</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 72,
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  controlText: { fontSize: 20, fontWeight: "800", color: colors.text },
  zoomPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  zoomText: { fontWeight: "700", color: colors.text },

  jumpNowBtn: {
    marginLeft: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  jumpNowText: { color: colors.primaryText, fontWeight: "800" },
});
